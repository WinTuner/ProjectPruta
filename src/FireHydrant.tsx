import DeviceDetail from './DeviceDetail';
import type { Device } from './types';

interface FireHydrantProps {
  devices: Device[];
  selectedId?: string;
  onSelect: (deviceId: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  onNavigateOverview: () => void;
  onComplaintSubmitted: () => void;
}

function FireHydrant(props: FireHydrantProps) {
  return <DeviceDetail {...props} type="hydrant" />;
}

export default FireHydrant;
