'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StopDTO } from '@/components/map/SSBMap';
import { MapPin, Search } from 'lucide-react';
import PlacePicker from '@/lib/maps/PlacePicker';

interface AddStopDialogProps {
  routeId: string;
  existingStops: Array<{ maDiem: number; tenDiem: string; viDo?: number | null | string; kinhDo?: number | null | string }>;
  currentRouteStops: StopDTO[];
  onClose: () => void;
  onAddStop: (data: { stop_id: number; sequence?: number; dwell_seconds?: number }) => void;
  onCreateStop: (data: { tenDiem: string; address?: string }) => void;
}

// Helper function to safely format coordinates
function formatCoordinate(coord: number | null | undefined | string, decimals: number = 4): string {
  if (coord === null || coord === undefined || coord === '') {
    return 'N/A';
  }
  const num = typeof coord === 'string' ? parseFloat(coord) : coord;
  if (isNaN(num) || !isFinite(num)) {
    return 'N/A';
  }
  return num.toFixed(decimals);
}

export default function AddStopDialog({
  routeId,
  existingStops,
  currentRouteStops,
  onClose,
  onAddStop,
  onCreateStop,
}: AddStopDialogProps) {
  const [selectedStopId, setSelectedStopId] = useState<string>('');
  const [dwellSeconds, setDwellSeconds] = useState<number>(30);
  const [newStopName, setNewStopName] = useState('');
  const [newStopAddress, setNewStopAddress] = useState('');

  const availableStops = existingStops.filter(
    (stop) => !currentRouteStops.find((rs) => rs.maDiem === stop.maDiem)
  );

  const handleAddExisting = () => {
    if (!selectedStopId) {
      return;
    }
    const nextSequence = currentRouteStops.length > 0 ? Math.max(...currentRouteStops.map((s) => s.sequence || 0)) + 1 : 1;
    onAddStop({
      stop_id: parseInt(selectedStopId),
      sequence: nextSequence,
      dwell_seconds: dwellSeconds,
    });
  };

  const handleCreateNew = () => {
    if (!newStopName.trim()) {
      return;
    }
    onCreateStop({
      tenDiem: newStopName.trim(),
      address: newStopAddress.trim() || undefined,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Thêm điểm dừng vào tuyến</DialogTitle>
          <DialogDescription>Chọn điểm dừng có sẵn hoặc tạo điểm dừng mới</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="existing" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Chọn điểm có sẵn</TabsTrigger>
            <TabsTrigger value="new">Tạo điểm mới</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Chọn điểm dừng</Label>
              <Select value={selectedStopId} onValueChange={setSelectedStopId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn điểm dừng..." />
                </SelectTrigger>
                <SelectContent>
                  {availableStops.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">Không còn điểm dừng nào</div>
                  ) : (
                    availableStops.map((stop) => (
                      <SelectItem key={stop.maDiem} value={String(stop.maDiem)}>
                        {stop.tenDiem} ({formatCoordinate(stop.viDo)}, {formatCoordinate(stop.kinhDo)})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Thời gian dừng (giây)</Label>
              <Input
                type="number"
                min="0"
                value={dwellSeconds}
                onChange={(e) => setDwellSeconds(parseInt(e.target.value) || 30)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button onClick={handleAddExisting} disabled={!selectedStopId}>
                Thêm vào tuyến
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Tìm kiếm địa điểm (Google Places)
              </Label>
              <PlacePicker
                onPlaceSelected={(place) => {
                  setNewStopName(place.name || '');
                  setNewStopAddress(place.address || '');
                }}
                placeholder="Tìm kiếm: Ngã tư Nguyễn Văn Linh, Quận 7..."
              />
              <p className="text-xs text-muted-foreground">
                Tìm kiếm sẽ tự động điền tên và địa chỉ. Tọa độ sẽ được tự động lấy từ địa chỉ.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tên điểm dừng *</Label>
              <Input value={newStopName} onChange={(e) => setNewStopName(e.target.value)} placeholder="VD: Ngã tư Nguyễn Văn Linh" />
            </div>

            <div className="space-y-2">
              <Label>Địa chỉ *</Label>
              <Input value={newStopAddress} onChange={(e) => setNewStopAddress(e.target.value)} placeholder="VD: Ngã tư Nguyễn Văn Linh, Quận 7, TP.HCM" />
              <p className="text-xs text-muted-foreground">
                Địa chỉ chi tiết để hệ thống tự động lấy tọa độ
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Hủy
              </Button>
            <Button onClick={handleCreateNew} disabled={!newStopName.trim() || !newStopAddress.trim()}>
              <MapPin className="w-4 h-4 mr-2" />
              Tạo và thêm vào tuyến
            </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

