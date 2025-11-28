"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"

interface OldRoute {
  maTuyen: number
  tenTuyen: string
  ngayTao?: string
  scheduleCount?: number
}

interface OldRoutesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  canDeleteRoutes: OldRoute[]
  cannotDeleteRoutes: OldRoute[]
  onConfirm: () => void
  onCancel: () => void
  onKeepAll: () => void
  deleting?: boolean
}

export function OldRoutesDialog({
  open,
  onOpenChange,
  canDeleteRoutes,
  cannotDeleteRoutes,
  onConfirm,
  onCancel,
  onKeepAll,
  deleting = false,
}: OldRoutesDialogProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: vi })
    } catch {
      return dateString
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Phát hiện tuyến cũ từ optimization
          </DialogTitle>
          <DialogDescription>
            Hệ thống đã phát hiện các tuyến đường cũ có cùng prefix. Bạn có thể xóa các tuyến không có lịch trình để tạo tuyến mới với tên gốc.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tuyến có thể xóa */}
          {canDeleteRoutes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                Có thể xóa ({canDeleteRoutes.length} tuyến)
              </div>
              <div className="bg-green-50 border border-green-200 rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                {canDeleteRoutes.map((route) => (
                  <div
                    key={route.maTuyen}
                    className="flex items-start justify-between text-sm"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{route.tenTuyen}</div>
                      <div className="text-xs text-muted-foreground">
                        Tạo: {formatDate(route.ngayTao)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tuyến không thể xóa */}
          {cannotDeleteRoutes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-600">
                <XCircle className="w-4 h-4" />
                Không thể xóa ({cannotDeleteRoutes.length} tuyến)
              </div>
              <div className="bg-red-50 border border-red-200 rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                {cannotDeleteRoutes.map((route) => (
                  <div
                    key={route.maTuyen}
                    className="flex items-start justify-between text-sm"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{route.tenTuyen}</div>
                      <div className="text-xs text-muted-foreground">
                        Đang có {route.scheduleCount || 0} lịch trình
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Các tuyến này đang được sử dụng trong lịch trình, không thể xóa.
              </p>
            </div>
          )}

          {/* Không có tuyến nào */}
          {canDeleteRoutes.length === 0 && cannotDeleteRoutes.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              Không có tuyến cũ nào được phát hiện.
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={deleting}
          >
            Hủy
          </Button>
          <Button
            variant="secondary"
            onClick={onKeepAll}
            disabled={deleting}
          >
            Giữ tất cả
          </Button>
          {canDeleteRoutes.length > 0 && (
            <Button
              onClick={onConfirm}
              disabled={deleting}
              className="bg-primary hover:bg-primary/90"
            >
              {deleting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Đang xóa...
                </>
              ) : (
                `Xóa ${canDeleteRoutes.length} tuyến có thể xóa`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

