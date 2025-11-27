"use client"

import { useEffect, useState, useMemo } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Search, 
  Filter, 
  X, 
  User, 
  Users, 
  Mail, 
  Phone, 
  GraduationCap,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX
} from "lucide-react"
import { apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useDebounce } from "@/lib/hooks/useDebounce"

type Account = {
  id: string
  name: string
  email?: string
  phone?: string
  role: string
  status: boolean
  studentsCount?: number
  students?: any[]
  raw?: any
}

export default function AccountsPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<"parents" | "students">("parents")
  
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Stats
  const [stats, setStats] = useState<{
    totalParents: number
    totalStudents: number
    activeParents: number
    activeStudents: number
  } | null>(null)

  useEffect(() => {
    fetchData()
  }, [currentPage, pageSize, debouncedSearch, roleFilter, statusFilter, activeTab])

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      if (activeTab === "students") {
        // Fetch students
        const params: any = {
          page: currentPage,
          limit: pageSize,
        }
        if (debouncedSearch) params.search = debouncedSearch
        
        const res = await apiClient.getStudents(params)
        const response = res as any
        const data = response.data || []
        const items = Array.isArray(data) ? data : data?.data || []
        
        const mappedAccounts: Account[] = items.map((s: any) => ({
          id: String(s.maHocSinh || s.id),
          name: s.hoTen || s.name,
          email: s.emailPhuHuynh || s.phuHuynh?.email,
          phone: s.sdtPhuHuynh || s.phuHuynh?.soDienThoai,
          role: "student",
          status: s.trangThai !== false,
          raw: s,
        }))
        
        setAccounts(mappedAccounts)
        const pagination = response.pagination || {}
        setTotal(pagination.total || items.length)
        setTotalPages(pagination.totalPages || Math.ceil((pagination.total || items.length) / pageSize))
      } else {
        // Fetch parents - we'll get them from students data
        // For now, we'll extract unique parents from students
        const res = await apiClient.getStudents({ limit: 1000 })
        const response = res as any
        const data = response.data || []
        const items = Array.isArray(data) ? data : data?.data || []
        
        // Group by parent
        const parentMap = new Map<string, Account>()
        items.forEach((s: any) => {
          if (s.maPhuHuynh && s.tenPhuHuynh) {
            const parentId = String(s.maPhuHuynh)
            if (!parentMap.has(parentId)) {
              parentMap.set(parentId, {
                id: parentId,
                name: s.tenPhuHuynh,
                email: s.emailPhuHuynh,
                phone: s.sdtPhuHuynh,
                role: "parent",
                status: true,
                studentsCount: 0,
                students: [],
                raw: { maNguoiDung: s.maPhuHuynh },
              })
            }
            const parent = parentMap.get(parentId)!
            parent.studentsCount = (parent.studentsCount || 0) + 1
            parent.students?.push(s)
          }
        })
        
        let filteredAccounts = Array.from(parentMap.values())
        
        // Apply filters
        if (debouncedSearch) {
          filteredAccounts = filteredAccounts.filter(
            (a) =>
              a.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
              a.email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
              a.phone?.includes(debouncedSearch)
          )
        }
        
        if (statusFilter !== "all") {
          filteredAccounts = filteredAccounts.filter((a) =>
            statusFilter === "active" ? a.status : !a.status
          )
        }
        
        // Paginate
        const start = (currentPage - 1) * pageSize
        const end = start + pageSize
        setAccounts(filteredAccounts.slice(start, end))
        setTotal(filteredAccounts.length)
        setTotalPages(Math.ceil(filteredAccounts.length / pageSize))
      }
    } catch (e: any) {
      setError(e?.message || "Không thể tải dữ liệu")
      toast({
        title: "Lỗi",
        description: e?.message || "Không thể tải danh sách tài khoản",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats() {
    try {
      const studentsRes = await apiClient.getStudents({ limit: 1000 })
      const studentsData = (studentsRes as any).data || []
      const students = Array.isArray(studentsData) ? studentsData : studentsData?.data || []
      
      const parentMap = new Map()
      students.forEach((s: any) => {
        if (s.maPhuHuynh) {
          if (!parentMap.has(s.maPhuHuynh)) {
            parentMap.set(s.maPhuHuynh, { active: s.trangThai !== false })
          }
        }
      })
      
      setStats({
        totalParents: parentMap.size,
        totalStudents: students.length,
        activeParents: Array.from(parentMap.values()).filter((p: any) => p.active).length,
        activeStudents: students.filter((s: any) => s.trangThai !== false).length,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quản lý Tài khoản</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý tài khoản phụ huynh và học sinh trong hệ thống
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-foreground">{stats.totalParents}</div>
                <p className="text-sm text-muted-foreground">Tổng phụ huynh</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-success">{stats.activeParents}</div>
                <p className="text-sm text-muted-foreground">Phụ huynh hoạt động</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-foreground">{stats.totalStudents}</div>
                <p className="text-sm text-muted-foreground">Tổng học sinh</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-success">{stats.activeStudents}</div>
                <p className="text-sm text-muted-foreground">Học sinh hoạt động</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Tài khoản</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="active">Hoạt động</SelectItem>
                    <SelectItem value="inactive">Ngừng hoạt động</SelectItem>
                  </SelectContent>
                </Select>
                {(searchQuery || statusFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSearchQuery("")
                      setStatusFilter("all")
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
            <Tabs value={activeTab} onValueChange={(v) => {
              setActiveTab(v as "parents" | "students")
              setCurrentPage(1)
            }}>
              <TabsList className="mb-4">
                <TabsTrigger value="parents">
                  <Users className="w-4 h-4 mr-2" />
                  Phụ huynh
                </TabsTrigger>
                <TabsTrigger value="students">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Học sinh
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-4">
                {loading && (
                  <div className="py-8 text-center text-muted-foreground">
                    Đang tải dữ liệu...
                  </div>
                )}
                {error && (
                  <div className="py-8 text-center text-destructive">{error}</div>
                )}
                {!loading && !error && accounts.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    Không tìm thấy tài khoản nào
                  </div>
                )}
                {!loading && !error && accounts.length > 0 && (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tài khoản</TableHead>
                          {activeTab === "parents" && <TableHead>Số học sinh</TableHead>}
                          {activeTab === "students" && <TableHead>Lớp</TableHead>}
                          <TableHead>Liên hệ</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead className="text-right">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accounts.map((account) => (
                          <TableRow key={account.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="bg-primary/10 text-primary">
                                    {account.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{account.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {account.role === "parent" ? "Phụ huynh" : "Học sinh"}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            {activeTab === "parents" && (
                              <TableCell>
                                <Badge variant="outline">
                                  {account.studentsCount || 0} học sinh
                                </Badge>
                              </TableCell>
                            )}
                            {activeTab === "students" && (
                              <TableCell>
                                <Badge variant="outline">
                                  {account.raw?.lop || "-"}
                                </Badge>
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="space-y-1">
                                {account.email && (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Mail className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs">{account.email}</span>
                                  </div>
                                )}
                                {account.phone && (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Phone className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs">{account.phone}</span>
                                  </div>
                                )}
                                {!account.email && !account.phone && (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  account.status
                                    ? "border-success text-success"
                                    : "border-muted text-muted-foreground"
                                }
                              >
                                {account.status ? (
                                  <>
                                    <UserCheck className="w-3 h-3 mr-1" />
                                    Hoạt động
                                  </>
                                ) : (
                                  <>
                                    <UserX className="w-3 h-3 mr-1" />
                                    Ngừng hoạt động
                                  </>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="icon">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon">
                                  <Edit className="w-4 h-4" />
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
                        Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, total)} trong tổng số {total} tài khoản
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

