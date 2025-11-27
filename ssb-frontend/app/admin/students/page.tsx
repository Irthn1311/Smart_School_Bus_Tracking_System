"use client"

import { useEffect, useState, useMemo } from "react"
import { useLanguage } from "@/lib/language-context"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search, Edit, Trash2, Eye, User, MapPin, Filter, X, ChevronLeft, ChevronRight } from "lucide-react"
import { StudentForm } from "@/components/admin/student-form"
import { apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useDebounce } from "@/lib/hooks/useDebounce"

type Student = {
  id: string
  name: string
  grade?: string
  birthDate?: string
  parentName?: string
  parentPhone?: string
  parentEmail?: string
  address?: string
  status?: boolean
  raw?: any
}

export default function StudentsPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [classFilter, setClassFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  
  // Stats state
  const [stats, setStats] = useState<{
    total: number
    byClass: Record<string, number>
    byGrade: Record<string, number>
    averageAge: number
    withParent: number
    withoutParent: number
  } | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  
  // Available classes for filter
  const [availableClasses, setAvailableClasses] = useState<string[]>([])

  function mapStudent(s: any): Student {
    return {
      id: String(s.maHocSinh || s.id || s._id || ''),
      name: s.hoTen || s.ten || s.name || '',
      grade: s.lop || s.grade,
      birthDate: s.ngaySinh || s.birthDate,
      parentName: s.tenPhuHuynh || s.parentName || s.phuHuynh?.hoTen,
      parentPhone: s.sdtPhuHuynh || s.parentPhone || s.phuHuynh?.soDienThoai,
      parentEmail: s.emailPhuHuynh || s.parentEmail || s.phuHuynh?.email,
      address: s.diaChi || s.address,
      status: s.trangThai !== undefined ? (s.trangThai === true || s.trangThai === 1 || s.trangThai === 'true') : true,
      raw: s,
    }
  }

  async function fetchStudents() {
    setLoading(true)
    setError(null)
    try {
      const params: any = {
        page: currentPage,
        limit: pageSize,
      }
      
      if (debouncedSearch) {
        params.search = debouncedSearch
      }
      
      if (classFilter !== "all") {
        params.lop = classFilter
      }
      
      const res = await apiClient.getStudents(params)
      const response = res as any
      
      const data = response.data || []
      const items = Array.isArray(data) ? data : data?.data || []
      setStudents(items.map(mapStudent))
      
      // Extract pagination info
      const pagination = response.pagination || {}
      setTotal(pagination.total || items.length)
      setTotalPages(pagination.totalPages || Math.ceil((pagination.total || items.length) / pageSize))
      
      // Extract available classes from data
      const classes = new Set<string>()
      items.forEach((s: any) => {
        if (s.lop) classes.add(s.lop)
      })
      setAvailableClasses(Array.from(classes).sort())
    } catch (e: any) {
      setError(e?.message || t("students.loadError"))
      console.error("Lỗi khi lấy danh sách học sinh:", e)
      toast({
        title: t("common.error"),
        description: e?.message || t("students.loadErrorDesc"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats() {
    setStatsLoading(true)
    try {
      const res = await apiClient.getStudentStats()
      const response = res as any
      setStats(response.data || null)
    } catch (e: any) {
      console.error("Lỗi khi lấy thống kê:", e)
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [currentPage, pageSize, debouncedSearch, classFilter])

  useEffect(() => {
    fetchStats()
  }, [])

  const handleDelete = async (student: Student) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa học sinh "${student.name}"?`)) return
    
    try {
      await apiClient.deleteStudent(student.id)
      toast({
        title: "Thành công",
        description: "Đã xóa học sinh",
      })
      fetchStudents()
      fetchStats() // Refresh stats
    } catch (err: any) {
      console.error(err)
      toast({
        title: "Lỗi",
        description: err?.message || "Xóa học sinh thất bại",
        variant: "destructive",
      })
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("students.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("students.description")}</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                {t("students.addNew")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("students.addNew")}</DialogTitle>
                <DialogDescription>{t("students.description")}</DialogDescription>
              </DialogHeader>
              <StudentForm
                onClose={() => setIsAddDialogOpen(false)}
                onCreated={() => {
                  fetchStudents()
                  fetchStats()
                }}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
              <DialogTitle>{t("students.edit")}</DialogTitle>
              <DialogDescription>{t("students.description")}</DialogDescription>
              </DialogHeader>
              <StudentForm
                mode="edit"
                initial={{
                  id: editingStudent?.id,
                  hoTen: editingStudent?.name,
                  lop: editingStudent?.grade,
                  ngaySinh: editingStudent?.birthDate 
                    ? (() => {
                        // Format ngày sinh cho input type="date" (YYYY-MM-DD)
                        const date = new Date(editingStudent.birthDate)
                        if (isNaN(date.getTime())) {
                          // Nếu không parse được, thử format khác
                          const dateStr = String(editingStudent.birthDate).split('T')[0].split(' ')[0]
                          return dateStr
                        }
                        const year = date.getFullYear()
                        const month = String(date.getMonth() + 1).padStart(2, '0')
                        const day = String(date.getDate()).padStart(2, '0')
                        return `${year}-${month}-${day}`
                      })()
                    : undefined,
                  diaChi: editingStudent?.address,
                  tenPhuHuynh: editingStudent?.parentName,
                  sdtPhuHuynh: editingStudent?.parentPhone,
                  emailPhuHuynh: editingStudent?.parentEmail,
                  maPhuHuynh: editingStudent?.raw?.maPhuHuynh,
                }}
                onClose={() => setIsEditDialogOpen(false)}
                onUpdated={() => {
                  fetchStudents()
                  fetchStats()
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                {statsLoading ? "..." : (stats?.total || 0)}
              </div>
              <p className="text-sm text-muted-foreground">{t("students.total")}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">
                {statsLoading ? "..." : (stats?.withParent || 0)}
              </div>
              <p className="text-sm text-muted-foreground">{t("students.withParent")}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-warning">
                {statsLoading ? "..." : (stats?.withoutParent || 0)}
              </div>
              <p className="text-sm text-muted-foreground">{t("students.withoutParent")}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">
                {statsLoading ? "..." : (stats?.averageAge || 0)}
              </div>
              <p className="text-sm text-muted-foreground">{t("students.avgAge")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("students.list")}</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t("students.search")}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1) // Reset to first page on search
                    }}
                    className="pl-10"
                  />
                </div>
                <Select value={classFilter} onValueChange={(value) => {
                  setClassFilter(value)
                  setCurrentPage(1) // Reset to first page on filter
                }}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder={t("students.allClasses")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("students.allClasses")}</SelectItem>
                    {availableClasses.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(searchQuery || classFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSearchQuery("")
                      setClassFilter("all")
                      setCurrentPage(1)
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && <div className="py-8 text-center text-muted-foreground">{t("students.loading")}</div>}
            {error && (
              <div className="py-8 text-center text-destructive">
                {error}
              </div>
            )}
            {!loading && !error && students.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                {t("students.noResults")}
              </div>
            )}
            {!loading && !error && students.length > 0 && (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("students.student")}</TableHead>
                      <TableHead>{t("students.class")}</TableHead>
                      <TableHead>{t("students.birthDate")}</TableHead>
                      <TableHead>{t("students.parent")}</TableHead>
                      <TableHead>{t("students.address")}</TableHead>
                      <TableHead>{t("students.status")}</TableHead>
                      <TableHead className="text-right">{t("students.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={student.raw?.anhDaiDien} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {student.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{student.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{student.grade || '-'}</Badge>
                        </TableCell>
                        <TableCell>
                          {student.birthDate
                            ? new Date(student.birthDate).toLocaleDateString('vi-VN')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {student.parentName ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm">{student.parentName}</span>
                              </div>
                              {student.parentPhone && (
                                <p className="text-xs text-muted-foreground">{student.parentPhone}</p>
                              )}
                              {student.parentEmail && (
                                <p className="text-xs text-muted-foreground">{student.parentEmail}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">{t("students.noParent")}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {student.address ? (
                            <div className="flex items-center gap-2 max-w-[200px]">
                              <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate" title={student.address}>
                                {student.address}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              student.status
                                ? "border-success text-success"
                                : "border-muted text-muted-foreground"
                            }
                          >
                            {student.status ? t("common.active") : t("students.inactive")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingStudent(student)
                                setIsEditDialogOpen(true)
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(student)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, total)} trong tổng số {total} học sinh
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={String(pageSize)}
                      onValueChange={(value) => {
                        setPageSize(Number(value))
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
