
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Search, Calendar, Palette, CheckSquare, Trash2, Loader2, Users, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const colorOptions = [
  { value: "red", label: "אדום", color: "bg-red-500" },
  { value: "yellow", label: "צהוב", color: "bg-yellow-400" },
  { value: "green", label: "ירוק", color: "bg-green-500" },
];

// Helper function to add delay between operations - SAFE & STABLE
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function SubmissionsReport() {
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedNicknames, setSelectedNicknames] = useState([]);
  const [selectedSubmissions, setSelectedSubmissions] = useState([]);
  const [bulkColor, setBulkColor] = useState("red");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState(null);
  const [updateProgress, setUpdateProgress] = useState(null);
  const queryClient = useQueryClient();

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['all-submissions'],
    queryFn: () => base44.entities.LotterySelection.list('-created_date'),
    initialData: [],
  });

  const { data: users } = useQuery({
    queryKey: ['all-users-for-groups'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const isWednesday = new Date().getDay() === 3;

  // Group submissions by nickname
  const nicknameGroups = {};
  submissions.forEach(sub => {
    const nickname = sub.nickname || sub.user_name;
    if (!nicknameGroups[nickname]) {
      nicknameGroups[nickname] = {
        nickname,
        submissions: [],
        color_tag: sub.color_tag || "green",
        count: 0
      };
    }
    nicknameGroups[nickname].submissions.push(sub);
    nicknameGroups[nickname].count++;
    if (!nicknameGroups[nickname].color_tag || nicknameGroups[nickname].submissions[0].color_tag) {
        nicknameGroups[nickname].color_tag = nicknameGroups[nickname].submissions[0].color_tag || "green";
    }
  });

  const updateColorMutation = useMutation({
    mutationFn: async ({ nickname, color }) => {
      const nicknameSubmissions = nicknameGroups[nickname]?.submissions || [];
      const total = nicknameSubmissions.length;
      let completed = 0;

      setUpdateProgress({ current: 0, total, nickname });

      for (const submission of nicknameSubmissions) {
        await base44.entities.LotterySelection.update(submission.id, { color_tag: color });
        completed++;
        setUpdateProgress({ current: completed, total, nickname });
        
        if (completed < total) {
          await delay(500);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-submissions'] });
      setUpdateProgress(null);
    },
    onError: (error) => {
      console.error("Error updating color:", error);
      setUpdateProgress(null);
      alert("❌ שגיאה בעדכון הצבע. נסה שוב.");
    }
  });

  const updateSelectedSubmissionsColorMutation = useMutation({
    mutationFn: async ({ submissionIds, color }) => {
      const total = submissionIds.length;
      let completed = 0;

      setUpdateProgress({ current: 0, total, nickname: "טפסים נבחרים" });

      for (const id of submissionIds) {
        await base44.entities.LotterySelection.update(id, { color_tag: color });
        completed++;
        setUpdateProgress(prev => ({ ...prev, current: completed }));
        
        if (completed < total) {
          await delay(500);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-submissions'] });
      setSelectedSubmissions([]);
      setUpdateProgress(null);
      alert("✅ הצבעים עודכנו בהצלחה!");
    },
    onError: (error) => {
      console.error("Error updating colors:", error);
      setUpdateProgress(null);
      alert("❌ שגיאה בעדכון הצבעים. נסה שוב.");
    }
  });

  const deleteSubmissionMutation = useMutation({
    mutationFn: async (submissionId) => {
      const submission = submissions.find(s => s.id === submissionId);
      const currentAdmin = await base44.auth.me();
      
      // ✅ במקום למחוק - מעדכנים שהטופס נמחק על ידי מנהל
      await base44.entities.LotterySelection.update(submissionId, {
        deleted_by_admin: true,
        deleted_by_admin_date: new Date().toISOString(),
        deleted_by_admin_name: currentAdmin.full_name
      });
      
      await base44.entities.ActivityLog.create({
        user_id: currentAdmin.id,
        user_email: currentAdmin.email,
        user_name: currentAdmin.full_name,
        action: "lottery_submission_deleted",
        details: `מנהל מחק טופס של ${submission.user_name} (${submission.user_email}) - כינוי: "${submission.nickname || 'ללא כינוי'}", מספרים: ${submission.numbers.join(', ')}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['selections'] });
      setDeleteDialogOpen(false);
      setSubmissionToDelete(null);
      alert("✅ הטופס הוסתר בהצלחה מפאנל הניהול! (עדיין גלוי למשתמש בהיסטוריה)");
    },
    onError: (error) => {
      console.error("Error deleting submission:", error);
      alert("❌ שגיאה במחיקת הטופס");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (nicknames) => {
      const currentAdmin = await base44.auth.me();
      let allDeletedSubmissions = [];
      let totalDeleted = 0;

      const totalSubmissionsToDelete = nicknames.reduce((sum, nickname) => 
        sum + (nicknameGroups[nickname]?.submissions.length || 0), 0
      );
      setUpdateProgress({ current: 0, total: totalSubmissionsToDelete, nickname: "כינויים נבחרים" });

      for (const nickname of nicknames) {
        const nicknameSubmissions = nicknameGroups[nickname]?.submissions || [];
        allDeletedSubmissions = [...allDeletedSubmissions, ...nicknameSubmissions];
        
        for (const submission of nicknameSubmissions) {
          // ✅ במקום למחוק - מעדכנים שהטופס נמחק על ידי מנהל
          await base44.entities.LotterySelection.update(submission.id, {
            deleted_by_admin: true,
            deleted_by_admin_date: new Date().toISOString(),
            deleted_by_admin_name: currentAdmin.full_name
          });
          totalDeleted++;
          setUpdateProgress(prev => ({ ...prev, current: totalDeleted }));
          await delay(500);
        }
      }
      
      await base44.entities.ActivityLog.create({
        user_id: currentAdmin.id,
        user_email: currentAdmin.email,
        user_name: currentAdmin.full_name,
        action: "lottery_submission_deleted",
        details: `מנהל מחק ${totalDeleted} טפסים מ-${nicknames.length} כינויים:\n${allDeletedSubmissions.slice(0, 10).map(s => `- ${s.user_name} (${s.nickname || 'ללא כינוי'}): ${s.numbers.join(', ')}`).join('\n')}${allDeletedSubmissions.length > 10 ? `\n... ועוד ${allDeletedSubmissions.length - 10}` : ''}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['selections'] });
      setSelectedNicknames([]);
      setUpdateProgress(null);
      alert(`✅ הכינויים הוסתרו בהצלחה מפאנל הניהול! (עדיין גלויים למשתמשים בהיסטוריה)`);
    },
    onError: (error) => {
      console.error("Error deleting submissions:", error);
      setUpdateProgress(null);
      alert("❌ שגיאה במחיקת הטפסים");
    },
  });

  const bulkUpdateColorMutation = useMutation({
    mutationFn: async ({ nicknames, color }) => {
      const total = nicknames.reduce((sum, nickname) => 
        sum + (nicknameGroups[nickname]?.submissions.length || 0), 0
      );
      let completed = 0;

      setUpdateProgress({ current: 0, total, nickname: "כינויים נבחרים" });

      for (const nickname of nicknames) {
        const nicknameSubmissions = nicknameGroups[nickname]?.submissions || [];
        
        for (const submission of nicknameSubmissions) {
          await base44.entities.LotterySelection.update(submission.id, { color_tag: color });
          completed++;
          setUpdateProgress(prev => ({ ...prev, current: completed }));
          
          if (completed < total) {
            await delay(500);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-submissions'] });
      setSelectedNicknames([]);
      setUpdateProgress(null);
      alert(`✅ הצבעים עודכנו בהצלחה!`);
    },
    onError: (error) => {
      console.error("Error updating colors:", error);
      setUpdateProgress(null);
      alert("❌ שגיאה בעדכון הצבעים. נסה שוב.");
    }
  });

  const turnAllRedMutation = useMutation({
    mutationFn: async () => {
      const allSubmissionsToUpdate = filteredSubmissions.filter(sub => sub.color_tag !== "red");
      const total = allSubmissionsToUpdate.length;
      let completed = 0;

      if (total === 0) return;

      setUpdateProgress({ current: 0, total, nickname: "כל הטפסים" });

      for (const submission of allSubmissionsToUpdate) {
        await base44.entities.LotterySelection.update(submission.id, { color_tag: "red" });
        completed++;
        setUpdateProgress(prev => ({ ...prev, current: completed }));
        
        if (completed < total) {
          await delay(500);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-submissions'] });
      setUpdateProgress(null);
      alert(`✅ כל הכינויים הופכו לאדום!`);
    },
    onError: (error) => {
      console.error("Error:", error);
      setUpdateProgress(null);
      alert("❌ שגיאה בעדכון. נסה שוב.");
    }
  });

  const updatePaymentStatusMutation = useMutation({
    mutationFn: async ({ submissionId, hasPaid }) => {
      await base44.entities.LotterySelection.update(submissionId, { has_paid: hasPaid });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-submissions'] });
    },
    onError: (error) => {
      console.error("Error updating payment status:", error);
      alert("❌ שגיאה בעדכון סטטוס התשלום");
    },
  });

  const filteredSubmissions = submissions.filter(sub => {
    // ✅ סינון רשומות שנמחקו על ידי מנהל - לא להציג בפאנל ניהול
    if (sub.deleted_by_admin === true) {
      return false;
    }
    
    const matchesSearch = !searchTerm || 
      sub.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.user_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const submissionDate = new Date(sub.created_date);
    const matchesStartDate = !startDate || submissionDate >= new Date(startDate);
    const matchesEndDate = !endDate || submissionDate <= new Date(endDate + 'T23:59:59');
    
    return matchesSearch && matchesStartDate && matchesEndDate;
  }).sort((a, b) => {
    // Sort by group
    const userA = users.find(u => u.email === a.user_email);
    const userB = users.find(u => u.email === b.user_email);
    
    const groupA = userA?.group || "none";
    const groupB = userB?.group || "none";
    
    // Define group order
    const groupOrder = { "group1": 1, "group2": 2, "group3": 3, "group4": 4, "none": 5 };
    
    const orderA = groupOrder[groupA] || 99; // Assign a high value for unknown groups
    const orderB = groupOrder[groupB] || 99; // Assign a high value for unknown groups
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // If same group, sort by nickname
    const nicknameA = a.nickname || a.user_name || "";
    const nicknameB = b.nickname || b.user_name || "";
    return nicknameA.localeCompare(nicknameB, 'he');
  });

  const handleColorChange = async (nickname, color) => {
    if (updateProgress) {
      alert("⏳ אנא המתן לסיום העדכון הנוכחי");
      return;
    }
    await updateColorMutation.mutateAsync({ nickname, color });
  };

  const handleDeleteClick = (submission) => {
    setSubmissionToDelete(submission);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (submissionToDelete) {
      deleteSubmissionMutation.mutate(submissionToDelete.id);
    }
  };

  const getColorClass = (colorValue) => {
    const option = colorOptions.find(opt => opt.value === colorValue);
    return option ? option.color : "bg-gray-200"; 
  };

  const handleToggleSubmission = (submissionId) => {
    if (selectedSubmissions.includes(submissionId)) {
      setSelectedSubmissions(selectedSubmissions.filter(id => id !== submissionId));
    } else {
      setSelectedSubmissions([...selectedSubmissions, submissionId]);
    }
  };

  const handleSelectAllSubmissions = () => {
    if (selectedSubmissions.length === filteredSubmissions.length && filteredSubmissions.length > 0) {
      setSelectedSubmissions([]);
    } else {
      setSelectedSubmissions(filteredSubmissions.map(s => s.id));
    }
  };

  const uniqueNicknames = [...new Set(filteredSubmissions.map(s => s.nickname || s.user_name))];

  const handleSelectAll = () => {
    const targetNicknames = uniqueNicknames;
    if (selectedNicknames.length === targetNicknames.length && targetNicknames.length > 0) {
      setSelectedNicknames([]);
    } else {
      setSelectedNicknames(targetNicknames);
    }
  };

  const handleBulkColorUpdate = async () => {
    if (selectedNicknames.length === 0) {
      alert("נא לבחור לפחות כינוי אחד");
      return;
    }
    if (updateProgress) {
      alert("⏳ אנא המתן לסיום העדכון הנוכחי");
      return;
    }
    
    const totalSubmissions = selectedNicknames.reduce((sum, nickname) => 
      sum + (nicknameGroups[nickname]?.submissions.length || 0), 0
    );
    
    if (confirm(`האם להגדיר ${selectedNicknames.length} כינויים (${totalSubmissions} טפסים) לצבע ${colorOptions.find(c => c.value === bulkColor)?.label}?`)) {
      await bulkUpdateColorMutation.mutateAsync({ nicknames: selectedNicknames, color: bulkColor });
    }
  };

  const handleBulkColorUpdateSubmissions = async () => {
    if (selectedSubmissions.length === 0) {
      alert("נא לבחור לפחות טופס אחד");
      return;
    }
    if (updateProgress) {
      alert("⏳ אנא המתן לסיום העדכון הנוכחי");
      return;
    }
    
    if (confirm(`האם להגדיר ${selectedSubmissions.length} טפסים נבחרים לצבע ${colorOptions.find(c => c.value === bulkColor)?.label}?`)) {
      await updateSelectedSubmissionsColorMutation.mutateAsync({ 
        submissionIds: selectedSubmissions, 
        color: bulkColor 
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedNicknames.length === 0) {
      alert("נא לבחור לפחות כינוי אחד למחיקה");
      return;
    }
    if (updateProgress) {
      alert("⏳ אנא המתן לסיום העדכון הנוכחי");
      return;
    }
    
    const totalSubmissions = selectedNicknames.reduce((sum, nickname) => 
      sum + (nicknameGroups[nickname]?.submissions.length || 0), 0
    );
    
    const confirmMessage = `⚠️ האם אתה בטוח שברצונך להסתיר ${selectedNicknames.length} כינויים (${totalSubmissions} טפסים) מפאנל הניהול?\n\nהכינויים יוסתרו מפאנל הניהול אך יישארו גלויים למשתמשים בהיסטוריה.`;
    
    if (confirm(confirmMessage)) {
      await bulkDeleteMutation.mutateAsync(selectedNicknames);
    }
  };

  const handleBulkDeleteSubmissions = async () => {
    if (selectedSubmissions.length === 0) {
      alert("נא לבחור לפחות טופס אחד למחיקה");
      return;
    }
    if (updateProgress) {
      alert("⏳ אנא המתן לסיום העדכון הנוכחי");
      return;
    }
    
    const confirmMessage = `⚠️ האם אתה בטוח שברצונך להסתיר ${selectedSubmissions.length} טפסים נבחרים מפאנל הניהול?\n\nהטפסים יוסתרו מפאנל הניהול אך יישארו גלויים למשתמשים בהיסטוריה.`;
    
    if (confirm(confirmMessage)) {
      let currentAdmin;
      try {
        currentAdmin = await base44.auth.me();
      } catch (e) {
        console.error("Error fetching current admin:", e);
        alert("שגיאה באחזור פרטי מנהל. לא ניתן לבצע מחיקה.");
        setUpdateProgress(null);
        return;
      }
      
      setUpdateProgress({ current: 0, total: selectedSubmissions.length, nickname: "טפסים נבחרים" });
      
      let deletedCount = 0;
      try {
        for (let i = 0; i < selectedSubmissions.length; i++) {
          const submissionId = selectedSubmissions[i];
          
          // ✅ במקום למחוק - מעדכנים שהטופס נמחק על ידי מנהל
          await base44.entities.LotterySelection.update(submissionId, {
            deleted_by_admin: true,
            deleted_by_admin_date: new Date().toISOString(),
            deleted_by_admin_name: currentAdmin.full_name
          });
          deletedCount++;
          
          setUpdateProgress(prev => ({ ...prev, current: deletedCount }));
          
          if (i < selectedSubmissions.length - 1) {
            await delay(500);
          }
        }
        
        await base44.entities.ActivityLog.create({
          user_id: currentAdmin.id,
          user_email: currentAdmin.email,
          user_name: currentAdmin.full_name,
          action: "lottery_submission_deleted_bulk_individual",
          details: `מנהל מחק ${deletedCount} טפסים באופן ידני מתוך בחירה בטבלה. טפסי ID: ${selectedSubmissions.join(', ')}`
        });
        
        queryClient.invalidateQueries({ queryKey: ['all-submissions'] });
        queryClient.invalidateQueries({ queryKey: ['selections'] });
        setSelectedSubmissions([]);
        setUpdateProgress(null);
        alert(`✅ ${deletedCount} טפסים הוסתרו בהצלחה מפאנל הניהול! (עדיין גלויים למשתמשים בהיסטוריה)`);

      } catch (error) {
        console.error("Error deleting selected submissions:", error);
        setUpdateProgress(null);
        alert("❌ שגיאה במחיקת הטפסים הנבחרים. נסה שוב.");
      }
    }
  };

  const handleTurnAllRed = async () => {
    if (updateProgress) {
      alert("⏳ אנא המתן לסיום העדכון הנוכחי");
      return;
    }
    
    if (confirm(`⚠️ האם להפוך את כל ${filteredSubmissions.length} הטפסים לצבע אדום?`)) {
      await turnAllRedMutation.mutateAsync();
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['כינוי', 'שם מלא', 'מספרים', 'תאריך שליחה', 'סימון צבע', 'שילם', 'קבוצה'],
      ...filteredSubmissions.map(sub => {
        const colorLabel = colorOptions.find(opt => opt.value === (sub.color_tag))?.label || "ללא צבע";
        const hasPaidLabel = sub.has_paid ? "כן" : "לא";
        const userGroup = users.find(u => u.email === sub.user_email)?.group || "ללא קבוצה";
        return [
          sub.nickname || sub.user_name,
          sub.user_name,
          sub.numbers.sort((a, b) => a - b).join(', '),
          format(new Date(sub.created_date), 'dd/MM/yyyy HH:mm', { locale: he }),
          colorLabel,
          hasPaidLabel,
          userGroup
        ];
      })
    ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `lottery_submissions_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTogglePayment = async (submissionId, currentStatus) => {
    await updatePaymentStatusMutation.mutateAsync({ 
      submissionId, 
      hasPaid: !currentStatus 
    });
  };

  const isAnyMutationPending = updateColorMutation.isPending || 
                               bulkUpdateColorMutation.isPending || 
                               turnAllRedMutation.isPending || 
                               bulkDeleteMutation.isPending ||
                               deleteSubmissionMutation.isPending ||
                               updateSelectedSubmissionsColorMutation.isPending ||
                               updatePaymentStatusMutation.isPending ||
                               updateProgress !== null; // Added this to cover manual async operations

  return (
    <>
      <Card className="border-2 border-purple-200 shadow-xl" dir="rtl">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-200 p-4 md:p-6">
          <CardTitle className="text-lg md:text-2xl font-bold text-purple-900">דוח שליחות לוטו - ממוין לפי קבוצות</CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          {updateProgress && (
            <Alert className="mb-4 md:mb-6 bg-blue-50 border-2 border-blue-400 shadow-lg">
              <Loader2 className="h-4 w-4 md:h-5 md:w-5 text-blue-600 animate-spin" />
              <AlertDescription className="text-blue-900 font-bold text-sm md:text-lg">
                <div className="flex items-center justify-between">
                  <span>מעדכן "{updateProgress.nickname}"...</span>
                  <span className="text-2xl font-black">{updateProgress.current} / {updateProgress.total}</span>
                </div>
                <div className="mt-2 h-3 bg-blue-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                    style={{ width: `${(updateProgress.current / updateProgress.total) * 100}%` }}
                  />
                </div>
              </AlertDescription>
            </Alert>
          )}

          {isWednesday && (
            <Alert className="mb-4 md:mb-6 bg-red-50 border-2 border-red-400 shadow-lg">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
              <AlertDescription className="text-red-900 font-bold text-sm md:text-lg">
                🔴 <strong>יום רביעי!</strong> זכור להפוך את כל הכינויים לאדום
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="חיפוש כינוי..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 border-purple-300 focus:border-purple-500 text-sm"
                />
              </div>
            </div>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="מתאריך"
              className="border-purple-300 focus:border-purple-500 text-sm"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="עד תאריך"
              className="border-purple-300 focus:border-purple-500 text-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <p className="text-gray-600 font-semibold text-sm md:text-base">
              סה"כ {filteredSubmissions.length} טפסים ({uniqueNicknames.length} כינויים)
              {selectedNicknames.length > 0 && (
                <span className="text-purple-600 mr-2">
                  | כינויים נבחרים: {selectedNicknames.length}
                </span>
              )}
              {selectedSubmissions.length > 0 && (
                <span className="text-blue-600 mr-2">
                  | טפסים נבחרים: {selectedSubmissions.length}
                </span>
              )}
            </p>
            <Button
              onClick={handleExport}
              disabled={filteredSubmissions.length === 0}
              size="sm"
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-xs md:text-sm w-full sm:w-auto"
            >
              <Download className="w-3 h-3 md:w-4 md:h-4 ml-2" />
              ייצא ל-CSV
            </Button>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-3 md:p-6 mb-4">
            <h3 className="text-base md:text-lg font-bold text-amber-900 mb-3 md:mb-4 flex items-center gap-2">
              <Palette className="w-4 h-4 md:w-5 md:h-5" />
              עדכון צבעים
            </h3>
            
            <div className="space-y-3 md:space-y-4">
              <div className="bg-red-100 border-2 border-red-400 rounded-lg p-3 md:p-4">
                <h4 className="text-sm md:text-md font-bold text-red-900 mb-2">🔴 פעולת יום רביעי</h4>
                <p className="text-xs md:text-sm text-red-800 mb-3">
                  הפוך את <strong>כל הטפסים</strong> המסוננים לצבע אדום
                </p>
                <Button
                  onClick={handleTurnAllRed}
                  disabled={isAnyMutationPending}
                  size="sm"
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-xs md:text-sm"
                >
                  {isAnyMutationPending && turnAllRedMutation.isPending ? (
                    <>
                      <Loader2 className="w-3 h-3 md:w-4 md:h-4 ml-2 animate-spin" />
                      מעדכן...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-3 h-3 md:w-4 md:h-4 ml-2" />
                      🔴 הפוך הכל לאדום ({filteredSubmissions.length})
                    </>
                  )}
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="bg-purple-100 border-2 border-purple-300 rounded-lg p-3 md:p-4">
                  <h4 className="text-sm md:text-md font-bold text-purple-900 mb-2 flex items-center gap-2">
                    <CheckSquare className="w-3 h-3 md:w-4 md:h-4" />
                    בחירה לפי כינויים
                  </h4>
                  <p className="text-xs md:text-sm text-purple-800 mb-3">
                    בחר כינויים (מתוך הסינון הנוכחי) ועדכן את כל הטפסים שלהם
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex gap-2 flex-wrap items-center">
                      <Select value={bulkColor} onValueChange={setBulkColor}>
                        <SelectTrigger className="w-full sm:w-48 border-2 border-purple-400 text-xs md:text-sm">
                          <SelectValue placeholder="בחר צבע" />
                        </SelectTrigger>
                        <SelectContent>
                          {colorOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full ${option.color} shadow-md`}></div>
                                <span className="text-xs md:text-sm">{option.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        onClick={handleSelectAll}
                        disabled={uniqueNicknames.length === 0 || isAnyMutationPending}
                        size="sm"
                        variant="outline"
                        className="border-purple-300 text-purple-600 hover:bg-purple-50 flex-1 sm:flex-none"
                      >
                        <CheckSquare className="w-3 h-3 md:w-4 md:h-4 ml-1" />
                        {selectedNicknames.length === uniqueNicknames.length && uniqueNicknames.length > 0 ? "בטל בחירת הכל" : `בחר הכל (${uniqueNicknames.length})`}
                      </Button>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                      <Button
                        onClick={handleBulkColorUpdate}
                        disabled={selectedNicknames.length === 0 || isAnyMutationPending}
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-xs md:text-sm"
                      >
                        {isAnyMutationPending && bulkUpdateColorMutation.isPending ? (
                          <>
                            <Loader2 className="w-3 h-3 md:w-4 md:h-4 ml-1 animate-spin" />
                            מעדכן...
                          </>
                        ) : (
                          <>
                            <Palette className="w-3 h-3 md:w-4 md:h-4 ml-1" />
                            עדכן כינויים ({selectedNicknames.length})
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={() => setSelectedNicknames([])}
                        disabled={selectedNicknames.length === 0 || isAnyMutationPending}
                        variant="outline"
                        size="sm"
                        className="border-2 border-gray-400 text-xs md:text-sm"
                      >
                        נקה
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-3 md:p-4">
                  <h4 className="text-sm md:text-md font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <CheckSquare className="w-3 h-3 md:w-4 md:h-4" />
                    בחירה ידנית מהטבלה
                  </h4>
                  <p className="text-xs md:text-sm text-blue-800 mb-3">
                    סמן טפסים בטבלה ועדכן את הצבע שלהם
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex gap-2 flex-wrap items-center">
                      <Button
                        onClick={handleBulkColorUpdateSubmissions}
                        disabled={selectedSubmissions.length === 0 || isAnyMutationPending}
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-xs md:text-sm"
                      >
                        {isAnyMutationPending && updateSelectedSubmissionsColorMutation.isPending ? (
                          <>
                            <Loader2 className="w-3 h-3 md:w-4 md:h-4 ml-1 animate-spin" />
                            מעדכן...
                          </>
                        ) : (
                          <>
                            <Palette className="w-3 h-3 md:w-4 md:h-4 ml-1" />
                            עדכן טפסים ({selectedSubmissions.length})
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={() => setSelectedSubmissions([])}
                        disabled={selectedSubmissions.length === 0 || isAnyMutationPending}
                        variant="outline"
                        size="sm"
                        className="border-2 border-gray-400 text-xs md:text-sm"
                      >
                        נקה
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delete Row */}
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
                <div className="grid md:grid-cols-2 gap-2">
                  {/* Delete by Nicknames */}
                  <Button
                    onClick={handleBulkDelete}
                    disabled={selectedNicknames.length === 0 || isAnyMutationPending}
                    size="sm"
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-xs md:text-sm"
                  >
                    {isAnyMutationPending && bulkDeleteMutation.isPending ? (
                      <>
                        <Loader2 className="w-3 h-3 md:w-4 md:h-4 ml-2 animate-spin" />
                        מוחק...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3 h-3 md:w-4 md:h-4 ml-2" />
                        🗑️ הסתר כינויים ({selectedNicknames.length})
                      </>
                    )}
                  </Button>

                  {/* Delete Individual Submissions */}
                  <Button
                    onClick={handleBulkDeleteSubmissions}
                    disabled={selectedSubmissions.length === 0 || isAnyMutationPending}
                    size="sm"
                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold text-xs md:text-sm"
                  >
                    {isAnyMutationPending && updateProgress && updateProgress.nickname === "טפסים נבחרים" ? (
                      <>
                        <Loader2 className="w-3 h-3 md:w-4 md:h-4 ml-2 animate-spin" />
                        מוחק...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3 h-3 md:w-4 md:h-4 ml-2" />
                        🗑️ הסתר טפסים ({selectedSubmissions.length})
                      </>
                    )}
                  </Button>
                </div>
                
                {(selectedNicknames.length > 0 || selectedSubmissions.length > 0) && (
                  <p className="text-xs text-red-700 font-semibold mt-2 text-center">
                    ⚠️ פעולה זו תסתיר את הטפסים מפאנל הניהול, אך הם יישארו גלויים למשתמשים בהיסטוריה.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-lg p-3 md:p-4 mb-4">
            <h3 className="text-sm md:text-base font-bold text-blue-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              קבוצות והמשתמשים בהן
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { value: "group1", label: "קבוצה 1", color: "from-blue-500 to-blue-600", borderColor: "border-blue-400", bgColor: "bg-blue-50" },
                { value: "group2", label: "קבוצה 2", color: "from-green-500 to-green-600", borderColor: "border-green-400", bgColor: "bg-green-50" },
                { value: "group3", label: "קבוצה 3", color: "from-purple-500 to-purple-600", borderColor: "border-purple-400", bgColor: "bg-purple-50" },
                { value: "group4", label: "קבוצה 4", color: "from-orange-500 to-orange-600", borderColor: "border-orange-400", bgColor: "bg-orange-50" },
              ].map((group) => {
                const usersInGroup = users.filter(u => u.group === group.value);
                
                const submissionsInGroup = filteredSubmissions.filter(sub => {
                  const user = users.find(u => u.email === sub.user_email);
                  return user?.group === group.value;
                }).length;

                return (
                  <div
                    key={group.value}
                    className={`border-2 ${group.borderColor} rounded-lg p-4 ${group.bgColor}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-lg">{group.label}</h4>
                      <div className="flex gap-2 text-xs">
                        <Badge variant="secondary" className="bg-white">
                          {usersInGroup.length} משתמשים
                        </Badge>
                        <Badge variant="secondary" className="bg-white">
                          {submissionsInGroup} טפסים
                        </Badge>
                      </div>
                    </div>

                    {usersInGroup.length > 0 ? (
                      <div className="text-xs space-y-1">
                        <p className="font-semibold mb-2 text-gray-700">👥 משתמשים בקבוצה:</p>
                        <div className="flex flex-wrap gap-1">
                          {usersInGroup.map(user => (
                            <Badge 
                              key={user.id} 
                              variant="outline" 
                              className="text-xs bg-white text-gray-700 border-gray-300"
                            >
                              {user.display_name || user.full_name || user.email}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">
                        אין משתמשים בקבוצה זו
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Mobile View - Cards */}
          <div className="md:hidden space-y-3 mb-4">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="border-2 border-purple-200">
                  <CardContent className="p-3">
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : filteredSubmissions.length === 0 ? (
              <Card className="border-2 border-gray-200">
                <CardContent className="p-6 text-center text-gray-500 text-sm">
                  לא נמצאו טפסים תואמים לסינון
                </CardContent>
              </Card>
            ) : (
              filteredSubmissions.map((submission) => {
                const colorTag = submission.color_tag || "green";
                const isSelected = selectedSubmissions.includes(submission.id);
                const hasPaid = submission.has_paid || false;
                
                return (
                  <Card 
                    key={submission.id}
                    className={`border-2 border-purple-200 ${isSelected ? 'bg-purple-100' : ''}`}
                  >
                    <CardContent className="p-3 space-y-3">
                      {/* Header - Checkbox + Color + Nickname */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSubmission(submission.id)}
                            disabled={isAnyMutationPending}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button 
                                className={`w-5 h-5 rounded-full ${getColorClass(colorTag)} shadow-md hover:scale-110 transition-transform cursor-pointer border-2 border-gray-300`}
                                disabled={isAnyMutationPending}
                                title={`שנה צבע עבור כינוי "${submission.nickname}"`}
                              />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center">
                              {colorOptions.map(option => (
                                <DropdownMenuItem
                                  key={option.value}
                                  onClick={() => handleColorChange(submission.nickname, option.value)}
                                  className="flex items-center gap-2 cursor-pointer"
                                  disabled={isAnyMutationPending}
                                >
                                  <div className={`w-4 h-4 rounded-full ${option.color} shadow-sm border border-gray-300`}></div>
                                  <span>{option.label}</span>
                                  {colorTag === option.value && (
                                    <span className="mr-auto text-green-600">✓</span>
                                  )}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <Button
                          onClick={() => handleDeleteClick(submission)}
                          variant="outline"
                          size="sm"
                          className="border-red-300 text-red-600 hover:bg-red-50 h-8 px-2"
                          disabled={isAnyMutationPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Nickname + Name */}
                      <div>
                        <p className="font-bold text-purple-900 text-base">{submission.nickname}</p>
                        <p className="text-sm text-gray-600">{submission.user_name}</p>
                      </div>

                      {/* Numbers */}
                      <div className="flex gap-1 flex-wrap">
                        {submission.numbers.sort((a, b) => a - b).map((num) => (
                          <Badge
                            key={num}
                            className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-sm"
                          >
                            {num}
                          </Badge>
                        ))}
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-2 text-sm text-gray-600 bg-purple-50 rounded p-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(submission.created_date).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })}</span>
                        <span className="text-gray-400">•</span>
                        <span>{new Date(submission.created_date).toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {/* Payment Switch */}
                      <div className="flex items-center justify-between bg-white rounded-lg p-3 border-2 border-gray-200">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={hasPaid}
                            onCheckedChange={() => handleTogglePayment(submission.id, hasPaid)}
                            disabled={isAnyMutationPending}
                            className={`${
                              hasPaid 
                                ? "bg-green-500 data-[state=checked]:bg-green-500" 
                                : "bg-red-500 data-[state=unchecked]:bg-red-500"
                            }`}
                          />
                          <span className={`text-sm font-semibold ${
                            hasPaid ? "text-green-700" : "text-red-700"
                          }`}>
                            {hasPaid ? "✓ שילם" : "✗ לא שילם"}
                          </span>
                        </div>
                        <Badge variant={hasPaid ? "default" : "destructive"} className={hasPaid ? "bg-green-500" : "bg-red-500"}>
                          {hasPaid ? "שולם" : "לא שולם"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Desktop View - Table */}
          <div className="hidden md:block border-2 border-purple-200 rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-purple-100 to-pink-100">
                  <TableHead className="font-bold text-purple-900 w-12 text-center text-sm p-4">
                    <Checkbox
                      checked={selectedSubmissions.length === filteredSubmissions.length && filteredSubmissions.length > 0}
                      onCheckedChange={handleSelectAllSubmissions}
                      disabled={isAnyMutationPending}
                    />
                  </TableHead>
                  <TableHead className="font-bold text-purple-900 w-12 text-center text-sm p-4">צבע</TableHead>
                  <TableHead className="font-bold text-purple-900 text-sm p-4">כינוי</TableHead>
                  <TableHead className="font-bold text-purple-900 text-sm p-4">שם מלא</TableHead>
                  <TableHead className="font-bold text-purple-900 text-sm p-4">מספרים</TableHead>
                  <TableHead className="font-bold text-purple-900 text-center text-sm p-4">תאריך</TableHead>
                  <TableHead className="font-bold text-purple-900 text-center text-sm p-4">תשלום</TableHead>
                  <TableHead className="font-bold text-purple-900 text-center text-sm p-4">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="p-4"><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell className="p-4"><Skeleton className="h-4 w-4 rounded-full" /></TableCell>
                      <TableCell className="p-4"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="p-4"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="p-4"><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell className="p-4"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="p-4"><Skeleton className="h-6 w-12" /></TableCell>
                      <TableCell className="p-4"><Skeleton className="h-8 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredSubmissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                      לא נמצאו טפסים תואמים לסינון
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubmissions.map((submission) => {
                    const colorTag = submission.color_tag || "green";
                    const isSelected = selectedSubmissions.includes(submission.id);
                    const hasPaid = submission.has_paid || false;
                    
                    return (
                      <TableRow 
                        key={submission.id} 
                        className={`hover:bg-purple-50 transition-colors ${
                          isSelected ? "bg-purple-100" : ""
                        }`}
                      >
                        <TableCell className="text-center p-4">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSubmission(submission.id)}
                            disabled={isAnyMutationPending}
                          />
                        </TableCell>
                        <TableCell className="text-center p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button 
                                className={`w-5 h-5 rounded-full ${getColorClass(colorTag)} shadow-md hover:scale-110 transition-transform cursor-pointer border-2 border-gray-300`}
                                title={`שנה צבע עבור כינוי "${submission.nickname}"`}
                                disabled={isAnyMutationPending}
                              />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center">
                              {colorOptions.map(option => (
                                <DropdownMenuItem
                                  key={option.value}
                                  onClick={() => handleColorChange(submission.nickname, option.value)}
                                  className="flex items-center gap-2 cursor-pointer"
                                  disabled={isAnyMutationPending}
                                >
                                  <div className={`w-4 h-4 rounded-full ${option.color} shadow-sm border border-gray-300`}></div>
                                  <span>{option.label}</span>
                                  {colorTag === option.value && (
                                    <span className="mr-auto text-green-600">✓</span>
                                  )}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="font-semibold text-purple-900 p-4">
                          {submission.nickname}
                        </TableCell>
                        <TableCell className="text-gray-700 p-4">
                          {submission.user_name}
                        </TableCell>
                        <TableCell className="p-4">
                          <div className="flex gap-1 flex-wrap">
                            {submission.numbers.sort((a, b) => a - b).map((num) => (
                              <Badge
                                key={num}
                                className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-sm"
                              >
                                {num}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm text-gray-600 p-4">
                          📅 {new Date(submission.created_date).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })}
                        </TableCell>
                        <TableCell className="text-center p-4">
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={hasPaid}
                              onCheckedChange={() => handleTogglePayment(submission.id, hasPaid)}
                              disabled={isAnyMutationPending}
                              className={`${
                                hasPaid 
                                  ? "bg-green-500 data-[state=checked]:bg-green-500" 
                                  : "bg-red-500 data-[state=unchecked]:bg-red-500"
                              }`}
                            />
                            <span className={`text-xs font-semibold ${
                              hasPaid ? "text-green-700" : "text-red-700"
                            }`}>
                              {hasPaid ? "✓ שילם" : "✗ לא שילם"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center p-4">
                          <Button
                            onClick={() => handleDeleteClick(submission)}
                            variant="outline"
                            size="sm"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            disabled={isAnyMutationPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <Trash2 className="w-6 h-6 text-red-600" />
              הסתרת טופס
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p className="font-bold text-base text-gray-900">
                  האם אתה בטוח שברצונך להסתיר את הטופס הזה מפאנל הניהול?
                </p>
                {submissionToDelete && (
                  <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
                    <p className="text-sm text-purple-900 mb-2 font-bold">
                      👤 משתמש: {submissionToDelete.user_name}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      📧 {submissionToDelete.user_email}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      🏷️ כינוי: <strong>{submissionToDelete.nickname || 'ללא כינוי'}</strong>
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      📅 {format(new Date(submissionToDelete.created_date), "dd/MM/yyyy בשעה HH:mm", { locale: he })}
                    </p>
                    <div className="flex gap-1 flex-wrap">
                      {submissionToDelete.numbers.sort((a, b) => a - b).map((num) => (
                        <Badge
                          key={num}
                          className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold"
                        >
                          {num}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <Alert className="bg-red-50 border-red-300">
                  <AlertDescription className="text-red-800 font-semibold text-sm">
                    ⚠️ <strong>שים לב:</strong> הטופס יוסתר מפאנל הניהול אך יישאר גלוי למשתמש בהיסטוריית השליחות שלו.
                  </AlertDescription>
                </Alert>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)} disabled={isAnyMutationPending}>
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isAnyMutationPending}
              className="bg-red-600 hover:bg-red-700 font-bold"
            >
              {isAnyMutationPending ? "מסתיר..." : "🗑️ הסתר טופס"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
