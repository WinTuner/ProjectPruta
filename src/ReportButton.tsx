import { useState } from 'react';
import { saveComplaint } from './lib/data';
import type { DeviceType } from './types';

interface ReportButtonProps {
  deviceId: string;
  deviceType: DeviceType;
  deviceName?: string;
  location?: string;
  status?: string;
  onSubmitted?: () => void;
}

function ReportButton({
  deviceId, 
  deviceType,
  deviceName = '-', 
  location = '-', 
  status = '-',
  onSubmitted,
}: ReportButtonProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleReportClick = async () => {
    if (!deviceId) {
      alert('ไม่พบรหัสอุปกรณ์');
      return;
    }

    try {
      setSubmitting(true);
      await saveComplaint({
        deviceId,
        deviceType,
        deviceName,
        location,
        status,
      });
      onSubmitted?.();
      alert(`บันทึกเรื่องร้องเรียนเรียบร้อย\n\nรหัสอุปกรณ์: ${deviceId}\nชื่อ/สถานที่: ${deviceName}\nพิกัด/โซน: ${location}\nสถานะปัจจุบัน: ${status}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึก';
      alert(`บันทึกเรื่องร้องเรียนไม่สำเร็จ: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
      <button
        onClick={handleReportClick}
        disabled={submitting}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: submitting ? '#fca5a5' : '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: submitting ? 'wait' : 'pointer',
          fontWeight: 'bold',
          fontSize: '1rem',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: '0.2s',
          boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
        }}
        onMouseOver={(e) => {
          if (!submitting) e.currentTarget.style.backgroundColor = '#dc2626';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = submitting ? '#fca5a5' : '#ef4444';
        }}
      >
        {submitting ? 'กำลังบันทึก...' : '📢 แจ้งซ่อมแซม / ร้องเรียน'}
      </button>
    </div>
  );
}

export default ReportButton;