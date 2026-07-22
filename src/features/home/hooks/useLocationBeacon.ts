import { useEffect, useRef, useState } from 'react';
import {
  invokeDriverHub,
  startDriverHub,
  stopDriverHub,
  getDriverHubState,
  type DriverHubState,
} from '@services/signalr';
import { sendLocationHeartbeat, getLatestBackgroundFix } from '@services/location';
import { ApiError } from '@services/api/types';
import { VEHICLE_TYPE } from '@constants/config';

// Nhịp gửi vị trí tài xế lên backend, tự chọn kênh theo vòng đời app:
//
//   foreground + hub connected  → SignalR UpdateLocation   (kênh chính)
//   foreground + hub chưa nối   → KHÔNG gửi, để useDriverHub lo kết nối lại
//   background                  → HTTP POST /location/heartbeat
//
// Vì sao lấy AppState làm căn cứ chứ không phải trạng thái hub: khi app vào nền, OS
// giết TCP socket nhưng SignalR chỉ nhận ra sau serverTimeoutInMilliseconds (60s) —
// suốt quãng đó hub vẫn báo 'connected' còn invoke() thì treo vĩnh viễn (không resolve,
// cũng không reject) nên .catch không bao giờ chạy → mất vị trí trong im lặng.
// AppState báo ngay và không nói dối.
//
// Ở nền LUÔN dùng HTTP kể cả khi hub còn báo 'connected', vì đúng lúc đó 'connected'
// là thứ không đáng tin nhất. Mỗi thời điểm chỉ một kênh: không gửi trùng, log dễ đọc.
// Endpoint heartbeat idempotent + có rate guard nên chuyển kênh qua lại là an toàn.

// Nhịp gửi vị trí (ms)
const LOCATION_INTERVAL_MS = 5000;

// Chờ tối đa bao lâu cho một lời gọi UpdateLocation trước khi coi socket đã chết (ms).
// Phải ngắn hơn LOCATION_INTERVAL_MS để không có 2 nhịp chồng nhau. Chính nhịp heartbeat
// trở thành phép thử liveness: phát hiện socket zombie trong 4s thay vì chờ đủ 60s
// serverTimeout — 60s câm lặng với tài xế là mất cả vị trí lẫn event "offer".
const HUB_INVOKE_TIMEOUT_MS = 4000;

// Vị trí từ task nền cũ hơn ngưỡng này thì coi như không còn đáng tin (OS đã ngừng đẩy),
// quay về toạ độ cuối cùng của Mapbox. Rộng rãi một chút vì khi tài xế đứng yên, OS có thể
// im lặng khá lâu mà vị trí vẫn đúng.
const FIX_MAX_AGE_MS = 60_000;

type Channel = 'hub' | 'api' | 'none';

// Nhãn kênh gắn vào dòng log, để nhìn một dòng bất kỳ là biết ngay nó đi bằng đường nào.
const CHANNEL_TAG: Record<Channel, string> = {
  hub: 'SignalR',
  api: 'API',
  none: 'ngừng',
};

class HubInvokeTimeoutError extends Error {}

// Promise.race có timeout, dọn sạch phần thừa: clearTimeout khi promise gốc về trước
// (nếu không, promise timeout vẫn reject muộn → cảnh báo unhandled rejection), và
// nuốt lỗi muộn của promise gốc khi timeout thắng.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new HubInvokeTimeoutError()), ms);
  });
  const raced = Promise.race([promise, timeout]);
  promise.catch(() => {}); // đã bỏ race rồi thì lỗi về muộn không còn ai bắt
  return raced.finally(() => clearTimeout(timer));
}

type Options = {
  /** Tài xế đang mở nhận chuyến */
  online: boolean;
  /** Vị trí hiện tại [lng, lat] theo chuẩn Mapbox */
  coords: [number, number];
  hubState: DriverHubState;
  /** Từ useAppState — 'inactive' của iOS KHÔNG tính là nền */
  isBackground: boolean;
};

export function useLocationBeacon({ online, coords, hubState, isBackground }: Options): void {
  // Kênh HTTP bị vô hiệu khi backend trả 404 (cờ fallback đang tắt) hoặc 403 (thiếu quyền)
  // — retry mỗi 5s trong 2 trường hợp này chỉ tổ spam log, tình hình không tự khá lên.
  const [apiDisabled, setApiDisabled] = useState(false);

  // Ref để interval luôn đọc toạ độ mới nhất mà không phải reset timer mỗi lần GPS cập nhật.
  const coordsRef = useRef(coords);
  coordsRef.current = coords;

  // Đọc trong callback bất đồng bộ để không hồi sinh kết nối sau khi tài xế đã tắt nhận chuyến.
  const onlineRef = useRef(online);
  onlineRef.current = online;

  const prevChannelRef = useRef<Channel>('none');
  const apiBeatsRef = useRef(0);
  const apiStartedAtRef = useRef(0);
  const apiInFlightRef = useRef(false);
  const revivingRef = useRef(false);

  const hubConnected = hubState === 'connected';

  const channel: Channel = !online
    ? 'none'
    : isBackground
      ? apiDisabled
        ? 'none'
        : 'api'
      : hubConnected
        ? 'hub'
        : 'none';

  useEffect(() => {
    const prev = prevChannelRef.current;
    if (prev !== channel) {
      // Tổng kết phiên chạy nền vừa xong. Đây là số liệu quan trọng nhất để đo cửa sổ
      // background thực tế của thiết bị: số nhịp sát (thời gian ở nền / 5s) nghĩa là JS
      // sống trọn; chỉ 1-2 nhịp cho vài chục giây nghĩa là OS đã suspend JS sớm và
      // muốn chạy nền lâu thì phải làm background location task thật sự.
      let tail = '';
      if (prev === 'api') {
        const seconds = Math.max(1, Math.round((Date.now() - apiStartedAtRef.current) / 1000));
        const expected = Math.floor(seconds / (LOCATION_INTERVAL_MS / 1000)) + 1;
        tail = ` — ${apiBeatsRef.current}/${expected} nhịp API trong ${seconds}s`;
      }

      if (channel === 'api') {
        console.log('[LOC] ⇄ chuyển sang API (nền)');
      } else if (channel === 'hub') {
        console.log(`[LOC] ⇄ chuyển sang SignalR (foreground)${tail}`);
      } else {
        const why = !online
          ? 'tắt nhận chuyến'
          : isBackground
            ? 'kênh API bị vô hiệu'
            : 'chờ SignalR kết nối';
        console.log(`[LOC] ⏸ ngừng gửi — ${why}${tail}`);
      }

      prevChannelRef.current = channel;
      if (channel === 'api') {
        apiBeatsRef.current = 0;
        apiStartedAtRef.current = Date.now();
        // Nếu OS suspend JS đúng lúc một request đang bay, promise đó không bao giờ settle
        // → cờ in-flight kẹt true và chặn mọi nhịp của LẦN vào nền sau. Dọn lại từ đầu mỗi phiên.
        apiInFlightRef.current = false;
      }
    }

    if (channel === 'none') return;

    // ── Kênh SignalR ──────────────────────────────────────────────────────────
    async function sendViaHub() {
      const [lng, lat] = coordsRef.current;
      try {
        // invoke = 2 chiều: chỉ resolve khi server gửi completion về, tức UpdateLocation()
        // phía .NET đã chạy xong không lỗi.
        await withTimeout(
          invokeDriverHub('UpdateLocation', {
            lat,
            lng,
            vehicleType: VEHICLE_TYPE,
            heading: 0,
            speed: 0,
          }),
          HUB_INVOKE_TIMEOUT_MS,
        );
        if (__DEV__) {
          console.log(`[LOC] ✓ SignalR (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
        }
      } catch (err) {
        if (err instanceof HubInvokeTimeoutError) {
          await reviveHub();
          return;
        }
        // Gửi trúng lúc rớt kết nối ≠ server từ chối: auto-reconnect sẽ nối lại và
        // effect tự bắn nhịp mới ngay khi connected — chỉ ghi nhận, không báo động.
        if (getDriverHubState() !== 'connected') {
          console.log(
            `[LOC] ↷ ${CHANNEL_TAG.hub} — bỏ qua 1 nhịp (mất kết nối, gửi lại sau khi reconnect)`,
          );
          return;
        }
        // console.log để LogBox không bung toast đỏ — message chứa exception từ server
        // (rõ hơn nếu backend bật EnableDetailedErrors ở môi trường dev).
        console.log(
          `[LOC] ✗ ${CHANNEL_TAG.hub} — UpdateLocation bị từ chối:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    // Socket còn báo 'connected' nhưng server không phản hồi trong 4s → gần như chắc chắn
    // TCP đã chết mà client chưa biết. Dựng lại hẳn thay vì chờ serverTimeout 60s.
    async function reviveHub() {
      if (revivingRef.current) return; // đã có một lượt dựng lại đang chạy
      revivingRef.current = true;
      console.log(
        `[LOC] ⚠ ${CHANNEL_TAG.hub} — server không phản hồi trong ${HUB_INVOKE_TIMEOUT_MS}ms, socket coi như đã chết → dựng lại kết nối SignalR`,
      );
      try {
        await stopDriverHub();
        if (!onlineRef.current) return; // tài xế đã tắt nhận chuyến trong lúc dựng lại
        await startDriverHub();
      } catch {
        // startDriverHub đã log nguyên nhân; effect retry trong useDriverHub sẽ thử lại.
      } finally {
        revivingRef.current = false;
      }
    }

    // ── Kênh HTTP ─────────────────────────────────────────────────────────────
    async function sendViaApi() {
      // API_TIMEOUT (15s) dài hơn nhịp 5s → mạng yếu ở nền có thể xếp chồng 3 request.
      // Bỏ nhịp mới còn hơn dồn đống: vị trí cũ gửi muộn thì cũng vô nghĩa.
      if (apiInFlightRef.current) return;
      apiInFlightRef.current = true;

      // Ở nền, locationManager của Mapbox (nguồn của coordsRef) ngừng cập nhật → toạ độ đóng
      // băng, gửi 5s/lần cũng chỉ lặp lại một điểm cũ. OS vẫn đẩy vị trí tươi qua task nền,
      // nên ưu tiên nguồn đó; chỉ quay về coordsRef khi task chưa kịp có fix nào.
      const fix = getLatestBackgroundFix();
      const fresh = fix !== null && Date.now() - fix.at < FIX_MAX_AGE_MS;
      const [fallbackLng, fallbackLat] = coordsRef.current;
      const lat = fresh ? fix.lat : fallbackLat;
      const lng = fresh ? fix.lng : fallbackLng;

      const startedAt = Date.now();
      try {
        await sendLocationHeartbeat({
          lat,
          lng,
          vehicleType: VEHICLE_TYPE,
          heading: fresh ? fix.heading : 0,
          speed: fresh ? fix.speed : 0,
        });
        apiBeatsRef.current += 1;
        if (__DEV__) {
          // "OS" / "cache" cho biết toạ độ đến từ đâu — nếu thấy "cache" lặp lại mãi khi đang
          // di chuyển thì task nền chưa chạy, vị trí gửi lên server là vị trí chết.
          const source = fresh ? 'OS' : 'cache';
          console.log(
            `[LOC] ✓ API #${apiBeatsRef.current} [${source}] (${lat.toFixed(5)}, ${lng.toFixed(5)}) ${Date.now() - startedAt}ms`,
          );
        }
      } catch (err) {
        if (!(err instanceof ApiError)) {
          console.log(`[LOC] ✗ ${CHANNEL_TAG.api} — lỗi không xác định:`, err);
          return;
        }
        if (err.status === 404) {
          // Auth chạy trước cổng bật/tắt, nên 404 với token hợp lệ = cờ đang tắt, không phải sai URL.
          console.log(
            '[LOC] ⚠ 404 — backend đang TẮT kênh API dự phòng (Location:HttpHeartbeat:Enabled=false).\n' +
              '        → Nhờ backend bật cờ này, nếu không app sẽ KHÔNG gửi được vị trí khi chạy nền.',
          );
          setApiDisabled(true);
          return;
        }
        if (err.status === 403) {
          console.log(
            '[LOC] ⚠ 403 — tài khoản thiếu quyền driver_approved. Ngừng dùng kênh API dự phòng.',
          );
          setApiDisabled(true);
          return;
        }
        if (err.status === 0) {
          // Mất sóng ở nền là chuyện thường — nhịp sau tự thử lại.
          console.log(`[LOC] ✗ ${CHANNEL_TAG.api} — lỗi mạng, thử lại ở nhịp sau`);
          return;
        }
        console.log(`[LOC] ✗ ${CHANNEL_TAG.api} — heartbeat ${err.status}: ${err.message}`);
      } finally {
        apiInFlightRef.current = false;
      }
    }

    const send = channel === 'hub' ? sendViaHub : sendViaApi;
    // Gửi ngay một nhịp khi vừa đổi kênh — cửa sổ background rất ngắn, không phí 5s chờ.
    send();
    const timer = setInterval(send, LOCATION_INTERVAL_MS);
    return () => clearInterval(timer);
    // channel đã gộp đủ online/isBackground/hubState/apiDisabled; mọi thứ khác đọc qua ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);
}
