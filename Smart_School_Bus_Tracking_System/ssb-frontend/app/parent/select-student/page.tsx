"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { User, MapPin, GraduationCap, Loader2 } from "lucide-react"

type Student = {
  maHocSinh: number
  hoTen: string
  lop?: string
  diaChi?: string
  tripInfo?: any
  raw?: any
}

export default function SelectStudentPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [selecting, setSelecting] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (user && user.role?.toLowerCase() !== "parent") {
      router.push(`/${user.role?.toLowerCase() || "admin"}`)
      return
    }

    fetchStudents()
  }, [user, authLoading, router])

  async function fetchStudents() {
    try {
      setLoading(true)
      const res = await apiClient.getStudentsByParent()
      const response = res as any
      const data = response.data || []
      
      if (data.length === 0) {
        toast({
          title: "Không có học sinh",
          description: "Bạn chưa có học sinh nào được liên kết",
          variant: "destructive",
        })
        router.push("/login")
        return
      }

      // Nếu chỉ có 1 học sinh, tự động chọn và chuyển
      if (data.length === 1) {
        selectStudent(data[0].maHocSinh)
        return
      }

      // Remove duplicates based on maHocSinh to prevent duplicate keys
      const uniqueStudents = Array.from(
        new Map(data.map((s: Student) => [s.maHocSinh, s])).values()
      )
      setStudents(uniqueStudents)
    } catch (error: any) {
      console.error("Error fetching students:", error)
      toast({
        title: "Lỗi",
        description: error?.message || "Không thể tải danh sách học sinh",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function selectStudent(studentId: number) {
    try {
      setSelecting(true)
      // Lưu selected student vào localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("selected_student_id", String(studentId))
      }
      
      // Chuyển đến trang chính
      router.push("/parent")
    } catch (error: any) {
      console.error("Error selecting student:", error)
      toast({
        title: "Lỗi",
        description: "Không thể chọn học sinh",
        variant: "destructive",
      })
    } finally {
      setSelecting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Chọn học sinh để theo dõi
          </CardTitle>
          <p className="text-center text-muted-foreground mt-2">
            Bạn có {students.length} học sinh. Vui lòng chọn học sinh bạn muốn theo dõi.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {students.map((student, index) => (
              <Card
                key={`${student.maHocSinh}-${index}`}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedStudentId === student.maHocSinh
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setSelectedStudentId(student.maHocSinh)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={student.raw?.anhDaiDien} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {student.hoTen.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{student.hoTen}</h3>
                        {student.lop && (
                          <Badge variant="outline">
                            <GraduationCap className="w-3 h-3 mr-1" />
                            {student.lop}
                          </Badge>
                        )}
                      </div>
                      {student.diaChi && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{student.diaChi}</span>
                        </div>
                      )}
                      {student.tripInfo && (
                        <div className="text-xs text-muted-foreground">
                          Tuyến: {student.tripInfo.tenTuyen || "—"}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedStudentId === student.maHocSinh
                            ? "border-primary bg-primary"
                            : "border-border"
                        }`}
                      >
                        {selectedStudentId === student.maHocSinh && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.removeItem("ssb_token")
                  localStorage.removeItem("token")
                  localStorage.removeItem("selected_student_id")
                }
                router.push("/login")
              }}
              disabled={selecting}
            >
              Đăng xuất
            </Button>
            <Button
              onClick={() => {
                if (selectedStudentId) {
                  selectStudent(selectedStudentId)
                } else {
                  toast({
                    title: "Vui lòng chọn học sinh",
                    description: "Bạn cần chọn một học sinh để tiếp tục",
                    variant: "destructive",
                  })
                }
              }}
              disabled={!selectedStudentId || selecting}
            >
              {selecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Tiếp tục"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

