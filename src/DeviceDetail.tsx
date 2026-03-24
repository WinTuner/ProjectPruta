import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Calendar, Droplet, Gauge, Lightbulb, MapPin, RefreshCw, Signal, Users, Wifi } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './durablearticles.css';
import { getStatusBadgeClass, statusColors, statusLabels } from './status';
import ReportButton from './ReportButton';
import type { Device, DeviceType } from './types';

const iconDefaultPrototype = (
  L.Icon.Default as unknown as {
    prototype: {
      _getIconUrl?: string;
    };
  }
).prototype;
delete iconDefaultPrototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface DeviceDetailProps {
  type: DeviceType;
  devices: Device[];
  selectedId?: string;
  onSelect: (deviceId: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  onNavigateOverview: () => void;
  onComplaintSubmitted: () => void;
}

type TypeConfig = {
  title: string;
  subtitle: string;
  icon: string;
  listIcon: ReactNode;
};

const TYPE_CONFIG: Record<DeviceType, TypeConfig> = {
  streetlight: {
    title: 'ไฟส่องสว่าง',
    subtitle: 'ฐานข้อมูลครุภัณฑ์ไฟสาธารณะ',
    icon: '💡',
    listIcon: <Lightbulb size={20} color="#2563eb" />,
  },
  wifi: {
    title: 'ไวไฟชุมชน',
    subtitle: 'จุดกระจายสัญญาณอินเทอร์เน็ตฟรี',
    icon: '📶',
    listIcon: <Wifi size={20} color="#2563eb" />,
  },
  hydrant: {
    title: 'ประปาหัวแดง',
    subtitle: 'จุดจ่ายน้ำดับเพลิงและแรงดันน้ำ',
    icon: '🚒',
    listIcon: <Droplet size={20} color="#dc2626" />,
  },
};

function toLatLng(device: Device): [number, number] | null {
  if (!Number.isFinite(device.lat) || !Number.isFinite(device.lng)) {
    return null;
  }

  return [device.lat, device.lng];
}

function DeviceDetail({
  type,
  devices,
  selectedId,
  onSelect,
  onRefresh,
  refreshing,
  onNavigateOverview,
  onComplaintSubmitted,
}: DeviceDetailProps) {
  const config = TYPE_CONFIG[type];
  const filteredDevices = useMemo(
    () => devices.filter((device) => device.type === type),
    [devices, type],
  );

  const [currentId, setCurrentId] = useState<string | undefined>(selectedId);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (selectedId) {
      setCurrentId(selectedId);
      return;
    }

    if (!currentId && filteredDevices.length > 0) {
      setCurrentId(filteredDevices[0].id);
    }
  }, [selectedId, filteredDevices, currentId]);

  const selectedDevice = useMemo(
    () => filteredDevices.find((item) => item.id === currentId) ?? filteredDevices[0],
    [filteredDevices, currentId],
  );

  useEffect(() => {
    if (!selectedDevice) {
      return;
    }

    setCurrentId(selectedDevice.id);
  }, [selectedDevice]);

  useEffect(() => {
    if (!mapContainerRef.current || !selectedDevice) return;

    const latLng = toLatLng(selectedDevice);
    if (!latLng) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current).setView(latLng, 16);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        keepBuffer: 4,
        updateWhenIdle: true,
        updateWhenZooming: false,
      }).addTo(map);
    } else {
      mapRef.current.setView(latLng, 16);
    }

    if (markerRef.current) {
      markerRef.current.remove();
    }

    const markerColor = statusColors[selectedDevice.status];
    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="marker-container" style="background-color: ${markerColor}">
          <span class="marker-icon">${config.icon}</span>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });

    const marker = L.marker(latLng, { icon: customIcon }).addTo(mapRef.current);
    markerRef.current = marker;

    const popupContent = `
      <div style="padding: 8px;">
        <h4 style="margin: 0 0 8px 0; font-size: 1rem; font-weight: 600;">
          ${config.icon} ${selectedDevice.id}
        </h4>
        <p style="margin: 4px 0; font-size: 0.875rem;"><strong>สถานที่:</strong> ${selectedDevice.name}</p>
        <p style="margin: 4px 0; font-size: 0.875rem;"><strong>พิกัด:</strong> ${selectedDevice.lat.toFixed(6)}, ${selectedDevice.lng.toFixed(6)}</p>
        <p style="margin: 4px 0; font-size: 0.875rem;"><strong>สถานะ:</strong> ${statusLabels[selectedDevice.status]}</p>

        <button
          class="goto-overview-btn"
          style="width: 100%; margin-top: 10px; padding: 8px 10px; background-color: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-family: inherit;"
          onmouseover="this.style.backgroundColor='#2563eb'"
          onmouseout="this.style.backgroundColor='#3b82f6'"
        >
          🗺️ ไปที่ภาพรวม
        </button>
      </div>
    `;

    marker.bindPopup(popupContent);

    marker.on('popupopen', (event) => {
      const popupElement = event.popup.getElement();
      if (!popupElement) return;

      const gotoBtn = popupElement.querySelector('.goto-overview-btn');
      if (!gotoBtn) return;

      gotoBtn.addEventListener(
        'click',
        () => {
          onNavigateOverview();
          marker.closePopup();
        },
        { once: true },
      );
    });

  }, [selectedDevice, onNavigateOverview, config.icon]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
  }, []);

  if (filteredDevices.length === 0) {
    return (
      <div className="sl-container">
        <div className="sl-header">
          <h2>{config.title}</h2>
          <p>ไม่พบข้อมูลอุปกรณ์</p>
        </div>
      </div>
    );
  }

  const renderDetailRows = (device: Device) => {
    if (device.type === 'streetlight') {
      return (
        <>
          <div><span className="sl-field-label">เจ้าของครุภัณฑ์</span><p className="sl-field-value">{device.owner || '-'}</p></div>
          <div><span className="sl-field-label">ประเภทโคม</span><p className="sl-field-value">{device.lampType || '-'}</p></div>
          <div><span className="sl-field-label">หลอดไฟ</span><p className="sl-field-value">{device.bulbType || '-'}</p></div>
          <div><span className="sl-field-label">กำลังไฟ</span><p className="sl-field-value">{device.watt || '-'}</p></div>
          <div><span className="sl-field-label">ตู้ควบคุม</span><p className="sl-field-value">{device.boxId || '-'}</p></div>
          <div><span className="sl-field-label">วันที่บันทึกภาพ</span><p className="sl-field-value">{device.imageDate || '-'}</p></div>
        </>
      );
    }

    if (device.type === 'wifi') {
      return (
        <>
          <div><span className="sl-field-label">ผู้ให้บริการ</span><p className="sl-field-value">{device.isp || '-'}</p></div>
          <div><span className="sl-field-label">ความเร็ว</span><p className="sl-field-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Signal size={16} /> {device.speed || '-'}</p></div>
          <div><span className="sl-field-label">ผู้ใช้งานขณะนี้</span><p className="sl-field-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={16} /> {device.deviceCount ?? 0} เครื่อง</p></div>
        </>
      );
    }

    return (
      <>
        <div><span className="sl-field-label">ระดับแรงดันน้ำ</span><p className="sl-field-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Gauge size={16} /> {device.pressure || '-'}</p></div>
        <div><span className="sl-field-label">ตรวจสอบล่าสุด</span><p className="sl-field-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> {device.lastCheck || '-'}</p></div>
      </>
    );
  };

  return (
    <div className="sl-container">
      <div className="sl-header">
        <div className="header-row">
          <div>
            <h2>{config.title}</h2>
            <p>{config.subtitle}</p>
          </div>
          <button onClick={onRefresh} className="btn-update" disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'spin-anim' : ''} />
            <span>{refreshing ? 'กำลังโหลด...' : 'อัปเดตข้อมูล'}</span>
          </button>
        </div>
      </div>

      <div className="sl-layout">
        <div className="sl-panel">
          <div className="sl-panel-header">
            {config.listIcon}
            <h3>รายการ ({filteredDevices.length})</h3>
          </div>

          <div className="sl-list-content">
            {filteredDevices.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => {
                  setCurrentId(item.id);
                  onSelect(item.id);
                }}
                className={`sl-card ${selectedDevice?.id === item.id ? 'active' : ''}`}
              >
                <div className="sl-card-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="sl-id">{item.id}</span>
                  </div>
                  <span className={`sl-status ${getStatusBadgeClass(statusLabels[item.status])}`}>
                    {statusLabels[item.status]}
                  </span>
                </div>
                <p className="sl-location">{item.name}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="sl-panel">
          <div className="sl-panel-header">
            <MapPin size={20} color="#2563eb" />
            <h3>รายละเอียดอุปกรณ์</h3>
          </div>

          <div className="sl-scrollable-content">
            <div className="sl-map-area" ref={mapContainerRef} style={{ height: '300px', width: '100%', position: 'relative', borderRadius: '8px', overflow: 'hidden' }} />

            {selectedDevice ? (
              <div className="sl-detail-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px' }}>{selectedDevice.id}</h2>
                  <span className={`sl-status ${getStatusBadgeClass(statusLabels[selectedDevice.status])}`} style={{ fontSize: '0.9rem', padding: '4px 12px' }}>
                    {statusLabels[selectedDevice.status]}
                  </span>
                </div>

                <div className="sl-detail-grid">
                  <div><span className="sl-field-label">สถานที่ตั้ง</span><p className="sl-field-value">{selectedDevice.name}</p></div>
                  <div><span className="sl-field-label">หน่วยงาน</span><p className="sl-field-value">{selectedDevice.department}</p></div>
                  <div><span className="sl-field-label">พิกัด</span><p className="sl-field-value">{selectedDevice.lat.toFixed(6)}, {selectedDevice.lng.toFixed(6)}</p></div>
                  {renderDetailRows(selectedDevice)}
                </div>

                <ReportButton
                  deviceId={selectedDevice.id}
                  deviceType={selectedDevice.type}
                  deviceName={selectedDevice.name}
                  location={`${selectedDevice.lat.toFixed(6)}, ${selectedDevice.lng.toFixed(6)}`}
                  status={statusLabels[selectedDevice.status]}
                  onSubmitted={onComplaintSubmitted}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeviceDetail;
