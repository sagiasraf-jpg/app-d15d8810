
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Shield, ShieldOff, Trash2, Search, Calendar, CheckCircle, XCircle, Key, Eye, EyeOff, Copy, Check, Phone, Edit2, AlertCircle, UserCog, Users, Plus, RefreshCw, X, Clock } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

const groupLabels = {
  none: "ללא קבוצה",
  group1: "קבוצה 1",
  group2: "קבוצה 2",
  group3: "קבוצה 3",
  group4: "קבוצה 4"
};

const groupColors = {
  none: "bg-gray-100 text-gray-800 border-gray-300",
  group1: "bg-blue-100 text-blue-800 border-blue-300",
  group2: "bg-green-100 text-green-800 border-green-300",
  group3: "bg-purple-100 text-purple-800 border-purple-300",
  group4: "bg-orange-100 text-orange-800 border-orange-300"
};

export default function UserManagement({ currentAdminId }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [roleChangeUserId, setRoleChangeUserId] = useState(null);
  const [roleChangeAction, setRoleChangeAction] = useState(null);
  const [roleChangeError, setRoleChangeError] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [editNameUser, setEditNameUser] = useState(null);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [groupChangeUser, setGroupChangeUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState("none");
  const [editPaymentUser, setEditPaymentUser] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({ total_forms: 0, paid_forms: 0, notes: "" });
  const [editingUnpaidId, setEditingUnpaidId] = useState(null);
  const [tempUnpaidValue, setTempUnpaidValue] = useState("");
  // Removed: const [approveUserId, setApproveUserId] = useState(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    initialData: [],
  });

  const { data: submissions } = useQuery({
    queryKey: ['all-submissions-count'],
    queryFn: () => base44.entities.LotterySelection.list(),
    initialData: [],
  });

  const { data: paymentRecords } = useQuery({
    queryKey: ['payment-records'],
    queryFn: () => base44.entities.UserPaymentRecord.list(),
    initialData: [],
  });

  const toggleRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole, userName, adminName }) => {
      await base44.entities.User.update(userId, { role: newRole });
      
      await base44.entities.ActivityLog.create({
        user_id: userId,
        user_email: users.find(u => u.id === userId)?.email || "",
        user_name: userName,
        action: "profile_update",
        details: `שינוי תפקיד ל-${newRole === 'admin' ? 'מנהל' : 'משתמש רגיל'} על ידי ${adminName}`,
        changed_by_admin_id: currentAdminId,
        changed_by_admin_name: adminName
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      setRoleChangeUserId(null);
      setRoleChangeAction(null);
      setRoleChangeError(null);
    },
    onError: (error) => {
      console.error("Error changing role:", error);
      setRoleChangeError(error.message || "שגיאה בשינוי תפקיד");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.entities.User.delete(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      setDeleteUserId(null);
    },
  });

  const updateDisplayNameMutation = useMutation({
    mutationFn: async ({ userId, displayName, adminName }) => {
      await base44.entities.User.update(userId, { display_name: displayName });
      
      await base44.entities.ActivityLog.create({
        user_id: userId,
        user_email: users.find(u => u.id === userId)?.email || "",
        user_name: displayName || users.find(u => u.id === userId)?.full_name || "",
        action: "profile_update",
        details: `שינוי שם תצוגה ל-"${displayName}" על ידי ${adminName}`,
        changed_by_admin_id: currentAdminId,
        changed_by_admin_name: adminName
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      setEditNameUser(null);
      setNewDisplayName("");
      alert("שם התצוגה עודכן בהצלחה! ✅");
    },
    onError: (error) => {
      console.error("Error updating display name:", error);
      alert("שגיאה בעדכון שם התצוגה");
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ userId, group, userName, adminName }) => {
      await base44.entities.User.update(userId, { group });
      
      await base44.entities.ActivityLog.create({
        user_id: userId,
        user_email: users.find(u => u.id === userId)?.email || "",
        user_name: userName,
        action: "profile_update",
        details: `שינוי קבוצה ל-${groupLabels[group]} על ידי ${adminName}`,
        changed_by_admin_id: currentAdminId,
        changed_by_admin_name: adminName
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      setGroupChangeUser(null);
      setSelectedGroup("none");
      alert("✅ הקבוצה עודכנה בהצלחה!");
    },
    onError: (error) => {
      console.error("Error updating group:", error);
      alert("❌ שגיאה בעדכון הקבוצה");
    },
  });

  const updatePaymentRecordMutation = useMutation({
    mutationFn: async ({ userEmail, userName, totalForms, paidForms, notes }) => {
      // Check if record exists
      const existingRecords = await base44.entities.UserPaymentRecord.filter({ user_email: userEmail });
      
      if (existingRecords.length > 0) {
        // Update existing
        await base44.entities.UserPaymentRecord.update(existingRecords[0].id, {
          user_email: userEmail, // Ensure email is consistent
          user_name: userName, // Ensure name is consistent
          total_forms_submitted: totalForms,
          paid_forms: paidForms,
          notes: notes || ""
        });
      } else {
        // Create new
        await base44.entities.UserPaymentRecord.create({
          user_email: userEmail,
          user_name: userName,
          total_forms_submitted: totalForms,
          paid_forms: paidForms,
          notes: notes || ""
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-records'] });
      setEditPaymentUser(null);
      setPaymentFormData({ total_forms: 0, paid_forms: 0, notes: "" });
      setEditingUnpaidId(null); // Ensure inline edit state is reset
      setTempUnpaidValue(""); // Ensure inline edit state is reset
      alert("✅ רשומת התשלום עודכנה בהצלחה!");
    },
    onError: (error) => {
      console.error("Error updating payment record:", error);
      alert("❌ שגיאה בעדכון רשומת התשלום");
    },
  });

  // Removed: New mutation for approving users (approveUserMutation)

  const generateRandomPassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleOpenPasswordReset = (user) => {
    setResetPasswordUser(user);
    setNewPassword(generateRandomPassword());
    setShowPassword(true);
    setCopiedPassword(false);
  };

  const handleOpenNameEdit = (user) => {
    setEditNameUser(user);
    setNewDisplayName(user.display_name || user.full_name || "");
  };

  const handleUpdateDisplayName = async () => {
    if (!newDisplayName.trim()) {
      alert("נא להזין שם תצוגה");
      return;
    }

    const currentAdmin = users.find(u => u.id === currentAdminId);
    await updateDisplayNameMutation.mutateAsync({
      userId: editNameUser.id,
      displayName: newDisplayName.trim(),
      adminName: currentAdmin?.full_name || "מנהל"
    });
  };

  const handleOpenGroupChange = (user) => {
    setGroupChangeUser(user);
    setSelectedGroup(user.group || "none");
  };

  const handleUpdateGroup = async () => {
    const currentAdmin = users.find(u => u.id === currentAdminId);
    await updateGroupMutation.mutateAsync({
      userId: groupChangeUser.id,
      group: selectedGroup,
      userName: groupChangeUser.full_name || groupChangeUser.email || "",
      adminName: currentAdmin?.full_name || "מנהל"
    });
  };

  const getUserPaymentRecord = (userEmail) => {
    const record = paymentRecords.find(r => r.user_email === userEmail);
    if (record) {
      const totalForms = record.total_forms_submitted;
      const paidForms = record.paid_forms;
      // const totalAmount = totalForms * 100; // Not used for display in the updated code
      // const paidAmount = paidForms * 100; // Not used for display in the updated code
      // const debt = totalAmount - paidAmount; // Not used for display in the updated code
      const unpaidForms = totalForms - paidForms;
      return {
        totalForms,
        paidForms,
        unpaidForms: unpaidForms,
        notes: record.notes || "",
        recordId: record.id
      };
    }
    return null;
  };

  const handleStartEditUnpaid = (user, paymentRecord) => {
    setEditingUnpaidId(user.email);
    setTempUnpaidValue(paymentRecord.unpaidForms.toString());
  };

  const handleSaveUnpaid = async (user, paymentRecord) => {
    const newUnpaid = parseInt(tempUnpaidValue) || 0;
    
    // חישוב paid_forms חדש (סה"כ פחות נותר)
    const newPaidForms = paymentRecord.totalForms - newUnpaid;
    
    await updatePaymentRecordMutation.mutateAsync({
      userEmail: user.email,
      userName: user.display_name || user.full_name,
      totalForms: paymentRecord.totalForms,
      paidForms: newPaidForms,
      notes: paymentRecord.notes
    });

    setEditingUnpaidId(null);
    setTempUnpaidValue("");
  };

  const handleCancelEditUnpaid = () => {
    setEditingUnpaidId(null);
    setTempUnpaidValue("");
  };

  const handleOpenPaymentEdit = (user) => {
    setEditPaymentUser(user);
    const record = getUserPaymentRecord(user.email);
    
    if (record) {
      // ⭐ IMPORTANT: Use the ACTUAL values from the database
      // The record.unpaidForms is CALCULATED, so we need to fetch the actual record
      const actualRecord = paymentRecords.find(r => r.user_email === user.email);
      
      setPaymentFormData({
        total_forms: actualRecord?.total_forms_submitted || 0,
        paid_forms: actualRecord?.paid_forms || 0,
        notes: actualRecord?.notes || ""
      });
    } else {
      setPaymentFormData({
        total_forms: 0,
        paid_forms: 0,
        notes: ""
      });
    }
  };

  // handleSyncWithHistory function removed as per changes

  const handleSavePaymentRecord = async () => {
    if (!editPaymentUser) {
      alert("שגיאה: משתמש לא נבחר לעדכון תשלום.");
      return;
    }

    await updatePaymentRecordMutation.mutateAsync({
      userEmail: editPaymentUser.email,
      userName: editPaymentUser.display_name || editPaymentUser.full_name,
      totalForms: paymentFormData.total_forms,
      paidForms: paymentFormData.paid_forms,
      notes: paymentFormData.notes
    });
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch (error) {
      console.error("Error copying password:", error);
      alert("שגיאה בהעתקת הסיסמה");
    }
  };

  const handleOpenWhatsApp = (phone, user, password) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = `שלום ${user.full_name}!

מנהל המערכת הגדיר עבורך סיסמה חדשה למערכת טופס לוטו 🎯

📧 *אימייל:* ${user.email}
🔑 *סיסמה:* ${password}

⚠️ *חשוב:*
1. השתמש בפרטים אלו להתחברות
2. מומלץ לשנות את הסיסמה לאחר הכניסה
3. שמור את הסיסמה במקום בטוח

🌐 כניסה למערכת: ${window.location.origin}

בהצלחה! 🎰`;

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleClosePasswordDialog = () => {
    setResetPasswordUser(null);
    setNewPassword("");
    setCopiedPassword(false);
  };

  const filteredUsers = users.filter(user =>
    !searchTerm ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserSubmissionsCount = (userEmail) => {
    return submissions.filter(s => s.user_email === userEmail).length;
  };

  const hasUserSubmitted = (userEmail) => {
    return submissions.some(s => s.user_email === userEmail);
  };

  const getUserSubmissions = (userEmail) => {
    return submissions.filter(s => s.user_email === userEmail);
  };
  
  const getDisplayName = (user) => {
    return user.display_name || user.full_name;
  };
  
  const handleViewAsUser = (user) => {
    // Save current admin user
    localStorage.setItem('impersonating_admin', JSON.stringify(currentAdminId));
    localStorage.setItem('impersonating_as', JSON.stringify(user));
    
    // Log activity
    base44.entities.ActivityLog.create({
      user_id: currentAdminId,
      user_email: users.find(u => u.id === currentAdminId)?.email || "",
      user_name: users.find(u => u.id === currentAdminId)?.full_name || "מנהל",
      action: "profile_update",
      details: `כניסה כמשתמש: ${user.full_name} (${user.email})`
    });

    // Reload page to update context
    window.location.reload();
  };

  return (
    <>
      <Card className="border-2 border-purple-200 shadow-xl" dir="rtl">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-200 p-4 md:p-6">
          <CardTitle className="text-lg md:text-2xl font-bold text-purple-900">ניהול משתמשים</CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          <div className="mb-4 md:mb-6">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="חיפוש משתמש..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 border-purple-300 focus:border-purple-500 text-sm"
              />
            </div>
          </div>

          <p className="text-gray-600 font-semibold mb-4 text-sm md:text-base">
            סה"כ {filteredUsers.length} משתמשים
          </p>

          {/* Mobile View - Cards */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="border-2 border-purple-200">
                  <CardContent className="p-3">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : filteredUsers.length === 0 ? (
              <Card className="border-2 border-gray-200">
                <CardContent className="p-6 text-center text-gray-500 text-sm">
                  לא נמצאו משתמשים
                </CardContent>
              </Card>
            ) : (
              filteredUsers.map((user) => {
                const userHasSubmitted = hasUserSubmitted(user.email);
                const userGroup = user.group || "none";
                const paymentRecord = getUserPaymentRecord(user.email);
                const isEditingThis = editingUnpaidId === user.email;
                // Removed: const isApproved = user.is_approved === true; 
                
                return (
                  <Card 
                    key={user.id} 
                    className={`border-2 ${
                      userHasSubmitted 
                        ? "border-green-300 bg-green-50" 
                        : "border-red-300 bg-red-50"
                    }`}
                  >
                    <CardContent className="p-3 space-y-3">
                      {/* Removed: Approval Status Banner */}

                      {/* Header - Status + Role + Group */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className={`w-5 h-5 rounded-full shadow-md border-2 ${
                              userHasSubmitted 
                                ? "bg-green-500 border-green-600" 
                                : "bg-red-500 border-red-600"
                            }`}
                            title={userHasSubmitted ? "שלח טופס ✓" : "לא שלח טופס ✗"}
                          />
                          {user.role === "admin" ? (
                            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                              <Shield className="w-3 h-3 ml-1" />
                              מנהל
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-gray-300 text-xs">
                              משתמש
                            </Badge>
                          )}
                          <Badge className={`${groupColors[userGroup]} border text-xs`}>
                            {groupLabels[userGroup]}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-lg ${
                            getUserSubmissionsCount(user.email) === 0 
                              ? "text-red-600" 
                              : "text-green-600"
                          }`}>
                            {getUserSubmissionsCount(user.email)}
                          </span>
                          <span className="text-xs text-gray-600">שליחות</span>
                        </div>
                      </div>

                      {/* Name */}
                      <div>
                        <p className="font-bold text-base">{getDisplayName(user)}</p>
                        {user.display_name && (
                          <p className="text-xs text-gray-500">מקור: {user.full_name}</p>
                        )}
                      </div>

                      {/* Email */}
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-gray-400">📧</span>
                        <span className="truncate">{user.email}</span>
                      </div>

                      {/* Payment Info - INLINE EDITABLE */}
                      {paymentRecord ? (
                        <div className="bg-white rounded-lg p-3 border-2 border-blue-300">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-blue-900">💰 נותר לתשלום</p>
                          </div>
                          <div className="flex items-center justify-center">
                            {isEditingThis ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={tempUnpaidValue}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    setTempUnpaidValue(val);
                                  }}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveUnpaid(user, paymentRecord);
                                    }
                                  }}
                                  className="w-20 h-12 text-center text-2xl font-black text-blue-600 border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveUnpaid(user, paymentRecord)}
                                  className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEditUnpaid}
                                  className="border-gray-400 h-8 w-8 p-0"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div 
                                onClick={() => handleStartEditUnpaid(user, paymentRecord)}
                                className="cursor-pointer hover:bg-blue-50 rounded-lg p-2 transition-colors"
                              >
                                <p className={`text-3xl font-black ${paymentRecord.unpaidForms === 0 ? 'text-green-600' : 'text-blue-600'}`}>
                                  {paymentRecord.unpaidForms}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenPaymentEdit(user)}
                          className="w-full border-blue-300 text-blue-600 hover:bg-blue-50 text-xs h-8"
                        >
                          <Plus className="w-3 h-3 ml-1" />
                          צור רשומת תשלום
                        </Button>
                      )}

                      {/* Nickname + Phone */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500 text-xs">כינוי:</span>
                          <p className="font-semibold">{user.nickname || "-"}</p>
                        </div>
                        <div dir="ltr" className="text-left">
                          <span className="text-gray-500 text-xs">טלפון:</span>
                          <p className="font-semibold">{user.phone || "-"}</p>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="flex items-center justify-between text-xs text-gray-600 bg-white rounded p-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{format(new Date(user.created_date), "dd/MM/yy", { locale: he })}</span>
                        </div>
                        {user.last_login ? (
                          <span className="text-green-600">
                            התחבר: {format(new Date(user.last_login), "dd/MM HH:mm", { locale: he })}
                          </span>
                        ) : (
                          <span className="text-gray-400">לא התחבר</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="space-y-2 pt-2 border-t">
                        {/* Removed: Approve User Button */}

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewAsUser(user)}
                            className="border-cyan-300 text-cyan-600 hover:bg-cyan-50 text-xs h-8"
                          >
                            <UserCog className="w-3 h-3 ml-1" />
                            היכנס
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenNameEdit(user)}
                            className="border-green-300 text-green-600 hover:bg-green-50 text-xs h-8"
                          >
                            <Edit2 className="w-3 h-3 ml-1" />
                            ערוך שם
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenGroupChange(user)}
                            className="border-indigo-300 text-indigo-600 hover:bg-indigo-50 text-xs h-8"
                          >
                            <Users className="w-3 h-3 ml-1" />
                            קבוצה
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRoleChangeUserId(user.id);
                              setRoleChangeAction(user.role === "admin" ? "demote" : "promote");
                              setRoleChangeError(null);
                            }}
                            disabled={user.id === currentAdminId}
                            className={`text-xs h-8 ${user.role === "admin" 
                              ? "border-red-300 text-red-600 hover:bg-red-50" 
                              : "border-purple-300 text-purple-600 hover:bg-purple-50"
                            }`}
                          >
                            {user.role === "admin" ? (
                              <>
                                <ShieldOff className="w-3 h-3 ml-1" />
                                הסר מנהל
                              </>
                            ) : (
                              <>
                                <Shield className="w-3 h-3 ml-1" />
                                הפוך למנהל
                              </>
                            )}
                          </Button>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenPasswordReset(user)}
                          className="w-full border-blue-300 text-blue-600 hover:bg-blue-50 text-xs h-8"
                        >
                          <Key className="w-3 h-3 ml-1" />
                          סיסמה
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteUserId(user.id)}
                          disabled={user.id === currentAdminId}
                          className="w-full border-red-300 text-red-600 hover:bg-red-50 text-xs h-8"
                        >
                          <Trash2 className="w-3 h-3 ml-1" />
                          מחק משתמש
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Desktop View - Table */}
          <div className="hidden md:block border-2 border-purple-200 rounded-lg overflow-x-auto">
            <div className="min-w-[1200px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-purple-100 to-pink-100">
                    <TableHead className="font-bold text-purple-900 w-12 text-center text-sm">סטטוס</TableHead>
                    <TableHead className="font-bold text-purple-900 text-sm">שם</TableHead>
                    <TableHead className="font-bold text-purple-900 text-sm">אימייל</TableHead>
                    <TableHead className="font-bold text-purple-900 text-sm">כינוי</TableHead>
                    <TableHead className="font-bold text-purple-900 text-sm">טלפון</TableHead>
                    <TableHead className="font-bold text-purple-900 text-sm">קבוצה</TableHead>
                    <TableHead className="font-bold text-purple-900 text-sm">תפקיד</TableHead>
                    <TableHead className="font-bold text-purple-900 text-sm">היסטוריה</TableHead>
                    <TableHead className="font-bold text-purple-900 text-sm">תשלום</TableHead>
                    <TableHead className="font-bold text-purple-900 text-sm">הרשמה</TableHead>
                    <TableHead className="font-bold text-purple-900 text-sm">כניסה</TableHead>
                    <TableHead className="font-bold text-purple-900 text-sm">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-4 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-12 text-gray-500">
                        לא נמצאו משתמשים
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => {
                      const userHasSubmitted = hasUserSubmitted(user.email);
                      const userGroup = user.group || "none";
                      const paymentRecord = getUserPaymentRecord(user.email);
                      const historyCount = getUserSubmissionsCount(user.email);
                      const isEditingThis = editingUnpaidId === user.email;
                      // Removed: const isApproved = user.is_approved === true; 
                      
                      return (
                        <TableRow 
                          key={user.id} 
                          className={`hover:bg-purple-50 transition-colors ${
                            !userHasSubmitted 
                              ? "bg-red-50" 
                              : "bg-green-50"
                          }`}
                        >
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              {/* Removed: Conditional rendering for !isApproved status */}
                              <div 
                                className={`w-5 h-5 rounded-full shadow-md border-2 ${
                                  userHasSubmitted 
                                    ? "bg-green-500 border-green-600" 
                                    : "bg-red-500 border-red-600"
                                }`}
                                title={userHasSubmitted ? "שלח טופס ✓" : "לא שלח טופס ✗"}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-semibold">{getDisplayName(user)}</p>
                              {user.display_name && (
                                <p className="text-xs text-gray-500">מקור: {user.full_name}</p>
                              )}
                              {/* Removed: !isApproved badge */}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">{user.email}</TableCell>
                          <TableCell className="text-gray-600">{user.nickname || "-"}</TableCell>
                          <TableCell className="text-gray-600" dir="ltr">
                            {user.phone || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${groupColors[userGroup]} border cursor-pointer hover:opacity-80`}
                              onClick={() => handleOpenGroupChange(user)}
                            >
                              {groupLabels[userGroup]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.role === "admin" ? (
                              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                                <Shield className="w-3 h-3 ml-1" />
                                מנהל
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-gray-300">
                                משתמש
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`font-semibold ${historyCount === 0 ? "text-gray-400" : "text-blue-600"}`}>
                              {historyCount}
                            </span>
                          </TableCell>
                          
                          <TableCell>
                            {paymentRecord ? (
                              <div className="flex items-center justify-center">
                                {isEditingThis ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      value={tempUnpaidValue}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setTempUnpaidValue(val);
                                      }}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSaveUnpaid(user, paymentRecord);
                                        }
                                      }}
                                      className="w-16 h-10 text-center text-xl font-black text-blue-600 border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveUnpaid(user, paymentRecord)}
                                      className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
                                    >
                                      <Check className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleCancelEditUnpaid}
                                      className="border-gray-400 h-8 w-8 p-0"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div 
                                    onClick={() => handleStartEditUnpaid(user, paymentRecord)}
                                    className="cursor-pointer hover:bg-blue-50 rounded-lg px-3 py-1 transition-colors"
                                  >
                                    <p className={`text-2xl font-black ${paymentRecord.unpaidForms === 0 ? 'text-green-600' : 'text-blue-600'}`}>
                                      {paymentRecord.unpaidForms}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenPaymentEdit(user)}
                                className="border-blue-300 text-blue-600 hover:bg-blue-50 text-xs"
                              >
                                <Plus className="w-3 h-3 ml-1" />
                                צור רשומה
                              </Button>
                            )}
                          </TableCell>

                          <TableCell className="text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              {format(new Date(user.created_date), "dd/MM/yy", { locale: he })}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600 text-sm">
                            {user.last_login ? (
                              format(new Date(user.last_login), "dd/MM/yy HH:mm", { locale: he })
                            ) : (
                              <span className="text-gray-400">לא התחבר</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 flex-wrap">
                              {/* Removed: Approve User Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewAsUser(user)}
                                className="border-cyan-300 text-cyan-600 hover:bg-cyan-50"
                              >
                                <UserCog className="w-3 h-3 ml-1" />
                                היכנס כמשתמש
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenNameEdit(user)}
                                className="border-green-300 text-green-600 hover:bg-green-50"
                              >
                                <Edit2 className="w-3 h-3 ml-1" />
                                ערוך שם
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenGroupChange(user)}
                                className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                              >
                                <Users className="w-3 h-3 ml-1" />
                                שנה קבוצה
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRoleChangeUserId(user.id);
                                  setRoleChangeAction(user.role === "admin" ? "demote" : "promote");
                                  setRoleChangeError(null);
                                }}
                                disabled={user.id === currentAdminId}
                                className={user.role === "admin" 
                                  ? "border-red-300 text-red-600 hover:bg-red-50" 
                                  : "border-purple-300 text-purple-600 hover:bg-purple-50"
                                }
                              >
                                {user.role === "admin" ? (
                                  <>
                                    <ShieldOff className="w-3 h-3 ml-1" />
                                    הסר מנהל
                                  </>
                                ) : (
                                  <>
                                    <Shield className="w-3 h-3 ml-1" />
                                    הפוך למנהל
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenPasswordReset(user)}
                                className="border-blue-300 text-blue-600 hover:bg-blue-50"
                              >
                                <Key className="w-3 h-3 ml-1" />
                                צור סיסמה
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeleteUserId(user.id)}
                                disabled={user.id === currentAdminId}
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Name Dialog */}
      <Dialog open={!!editNameUser} onOpenChange={() => setEditNameUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-green-600" />
              עריכת שם תצוגה
            </DialogTitle>
            <DialogDescription>
              עריכת שם התצוגה עבור <strong>{editNameUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="bg-blue-50 border-blue-300">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <strong>💡 טיפ:</strong> שם התצוגה יוצג במקום השם המקורי בכל המערכת
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="new-display-name" className="font-semibold">
                שם תצוגה חדש <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-display-name"
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                className="border-2 border-green-300 focus:border-green-500"
                placeholder="הזן שם תצוגה..."
              />
            </div>

            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-900 font-semibold mb-2">📋 פרטי המשתמש:</p>
              <div className="space-y-1 text-sm">
                <p className="text-purple-800"><strong>שם מקורי:</strong> {editNameUser?.full_name}</p>
                <p className="text-purple-800"><strong>שם תצוגה נוכחי:</strong> {editNameUser?.display_name || "(לא הוגדר - משתמש בשם המקורי)"}</p>
                <p className="text-purple-800"><strong>כינוי:</strong> {editNameUser?.nickname || "לא הוגדר"}</p>
                <p className="text-purple-800"><strong>אימייל:</strong> {editNameUser?.email}</p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditNameUser(null)}>
              ביטול
            </Button>
            <Button
              onClick={handleUpdateDisplayName}
              disabled={!newDisplayName.trim() || updateDisplayNameMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateDisplayNameMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                  מעדכן...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 ml-2" />
                  עדכן שם תצוגה
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Change Dialog */}
      <Dialog open={!!groupChangeUser} onOpenChange={() => setGroupChangeUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              שינוי קבוצה
            </DialogTitle>
            <DialogDescription>
              שינוי הקבוצה עבור <strong>{groupChangeUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="bg-blue-50 border-blue-300">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <strong>💡 טיפ:</strong> ניתן לשייך משתמשים לקבוצות לצורך ארגון וניהול
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="group-select" className="font-semibold">
                בחר קבוצה <span className="text-red-500">*</span>
              </Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger id="group-select" className="border-2 border-indigo-300 focus:border-indigo-500">
                  <SelectValue placeholder="בחר קבוצה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      <span>ללא קבוצה</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="group1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span>קבוצה 1</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="group2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>קבוצה 2</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="group3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span>קבוצה 3</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="group4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span>קבוצה 4</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-900 font-semibold mb-2">📋 פרטי המשתמש:</p>
              <div className="space-y-1 text-sm">
                <p className="text-purple-800"><strong>שם:</strong> {groupChangeUser?.display_name || groupChangeUser?.full_name}</p>
                <p className="text-purple-800"><strong>אימייל:</strong> {groupChangeUser?.email}</p>
                <p className="text-purple-800"><strong>קבוצה נוכחית:</strong> {groupLabels[groupChangeUser?.group || "none"]}</p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setGroupChangeUser(null)}>
              ביטול
            </Button>
            <Button
              onClick={handleUpdateGroup}
              disabled={updateGroupMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {updateGroupMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                  מעדכן...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 ml-2" />
                  עדכן קבוצה
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Edit Dialog - SIMPLIFIED & INDEPENDENT */}
      <Dialog open={!!editPaymentUser} onOpenChange={() => setEditPaymentUser(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              ניהול תשלומים - {editPaymentUser?.display_name || editPaymentUser?.full_name}
            </DialogTitle>
            <DialogDescription>
              עדכן את מספר הטפסים והתשלומים עבור <strong>{editPaymentUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="bg-blue-50 border-blue-300">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-sm">
                <strong>💡 חשוב:</strong> המספרים כאאן עצמאיים ולא קשורים לכמות הטפסים במערכת. עדכן אותם באופן ידני בלבד!
              </AlertDescription>
            </Alert>

            {/* Manual Payment Form - COMPLETELY INDEPENDENT */}
            <div className="space-y-4 bg-white border-2 border-blue-300 rounded-lg p-4">
              <p className="font-bold text-blue-900">✏️ עדכן ידנית (ללא קשר למערכת):</p>
              
              <div className="space-y-2">
                <Label htmlFor="total-forms" className="font-semibold text-blue-800">
                  סה"כ טפסים <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="total-forms"
                  type="number"
                  min="0"
                  value={paymentFormData.total_forms}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, total_forms: parseInt(e.target.value) || 0 }))}
                  className="border-2 border-blue-300 focus:border-blue-500 text-xl font-bold text-blue-700"
                />
                <p className="text-xs text-gray-600">מספר עצמאי - לא מתעדכן אוטומטית</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paid-forms" className="font-semibold text-blue-800">
                  כמה טפסים שולמו <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="paid-forms"
                  type="number"
                  min="0"
                  max={paymentFormData.total_forms}
                  value={paymentFormData.paid_forms}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, paid_forms: parseInt(e.target.value) || 0 }))}
                  className="border-2 border-blue-300 focus:border-blue-500 text-xl font-bold text-blue-700"
                />
                <p className="text-xs text-gray-600">מספר עצמאי - לא מתעדכן אוטומטית</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="font-semibold text-blue-800">
                  הערות (אופציונלי)
                </Label>
                <Input
                  id="notes"
                  type="text"
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="הערות נוספות..."
                  className="border-2 border-gray-300 focus:border-gray-500"
                />
              </div>
            </div>

            {/* Simple Summary - NO CURRENCY */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-lg p-4">
              <p className="text-sm font-bold text-blue-900 mb-3">📊 סיכום:</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center bg-white rounded-lg p-3 border-2 border-blue-300">
                  <p className="text-xs text-gray-600">סה"כ טפסים</p>
                  <p className="text-3xl font-black text-blue-600">{paymentFormData.total_forms}</p>
                </div>
                <div className="text-center bg-white rounded-lg p-3 border-2 border-green-400">
                  <p className="text-xs text-gray-600">שולמו</p>
                  <p className="text-3xl font-black text-green-600">{paymentFormData.paid_forms}</p>
                </div>
                <div className="text-center bg-white rounded-lg p-3 border-2 border-red-400">
                  <p className="text-xs text-gray-600">נותרו</p>
                  <p className={`text-3xl font-black ${(paymentFormData.total_forms - paymentFormData.paid_forms) === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {paymentFormData.total_forms - paymentFormData.paid_forms}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditPaymentUser(null)}>
              ביטול
            </Button>
            <Button
              onClick={handleSavePaymentRecord}
              disabled={updatePaymentRecordMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updatePaymentRecordMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                  שומר...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 ml-2" />
                  שמור רשומת תשלום
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={handleClosePasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600" />
              יצירת סיסמה חדשה
            </DialogTitle>
            <DialogDescription>
              יצירת סיסמה חדשה עבור <strong>{resetPasswordUser?.full_name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="bg-amber-50 border-amber-300">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                <strong>⚠️ חשוב:</strong> העתק את הסיסמה ושלח אותה למשתמש באופן מאובטח
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="new-password" className="font-semibold">סיסמה חדשה</Label>
              <div className="flex gap-2">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  readOnly
                  className="font-mono border-2 border-blue-300"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  className="border-blue-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyPassword}
                  className="border-blue-300"
                >
                  {copiedPassword ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              {copiedPassword && (
                <p className="text-xs text-green-600 font-semibold">✓ הסיסמה הועתקה ללוח</p>
              )}
            </div>

            {resetPasswordUser?.phone && (
              <div className="space-y-2">
                <Label className="font-semibold">שליחה בוואטסאפ</Label>
                <Button
                  type="button"
                  onClick={() => handleOpenWhatsApp(resetPasswordUser.phone, resetPasswordUser, newPassword)}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Phone className="w-4 h-4 ml-2" />
                  שלח סיסמה בוואטסאפ ל-{resetPasswordUser.phone}
                </Button>
              </div>
            )}

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-semibold mb-2">📋 פרטי התחברות:</p>
              <div className="space-y-1 text-sm">
                <p className="text-blue-800"><strong>שם:</strong> {resetPasswordUser?.full_name}</p>
                <p className="text-blue-800"><strong>אימייל:</strong> {resetPasswordUser?.email}</p>
                <p className="text-blue-800"><strong>סיסמה:</strong> {newPassword}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClosePasswordDialog}>
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Dialog */}
      <AlertDialog open={!!roleChangeUserId} onOpenChange={() => {
        setRoleChangeUserId(null);
        setRoleChangeAction(null);
        setRoleChangeError(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {roleChangeAction === "promote" ? (
                <>
                  <Shield className="w-5 h-5 text-purple-600" />
                  הפיכת משתמש למנהל
                </>
              ) : (
                <>
                  <ShieldOff className="w-5 h-5 text-red-600" />
                  הסרת הרשאות מנהל
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {roleChangeAction === "promote" 
                ? "האם אתה בטוח שברצונך להפוך את המשתמש למנהל מערכת? המשתמש יקבל גישה מלאה לכל תכונות הניהול."
                : "האם אתה בטוח שברצונך להסיר את הרשאות המנהל? המשתמש יהפוך למשתמש רגיל."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {roleChangeError && (
            <Alert variant="destructive" className="bg-red-50">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{roleChangeError}</AlertDescription>
            </Alert>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRoleChangeUserId(null);
              setRoleChangeAction(null);
              setRoleChangeError(null);
            }}>
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const user = users.find(u => u.id === roleChangeUserId);
                const currentAdmin = users.find(u => u.id === currentAdminId);
                await toggleRoleMutation.mutateAsync({
                  userId: roleChangeUserId,
                  newRole: roleChangeAction === "promote" ? "admin" : "user",
                  userName: user?.full_name || user?.email || "",
                  adminName: currentAdmin?.full_name || "מנהל"
                });
              }}
              className={roleChangeAction === "promote" 
                ? "bg-purple-600 hover:bg-purple-700" 
                : "bg-red-600 hover:bg-red-700"}
            >
              {toggleRoleMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                  מעדכן...
                </>
              ) : (
                roleChangeAction === "promote" ? "הפוך למנהל" : "הסר מנהל"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              מחיקת משתמש
            </AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את המשתמש? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserMutation.mutate(deleteUserId)}
              disabled={deleteUserMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteUserMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                  מוחק...
                </>
              ) : "מחק"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Removed: Approve User Dialog */}
    </>
  );
}
