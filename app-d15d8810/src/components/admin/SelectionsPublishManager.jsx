
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, EyeOff, CheckCircle, Calendar, User, Filter, Star, AlertCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
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
  { value: "all", label: "כל הצבעים", color: "" },
  { value: "red", label: "אדום (לא לפרסם)", color: "bg-red-500" },
  { value: "yellow", label: "צהוב (מספרים קבועים)", color: "bg-yellow-400" },
  { value: "green", label: "ירוק", color: "bg-green-500" },
];

export default function SelectionsPublishManager({ currentAdminId, currentAdminName }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [colorFilter, setColorFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: allSelections, isLoading: loadingSelections } = useQuery({
    queryKey: ['all-selections-admin'],
    queryFn: () => base44.entities.LotterySelection.list('-created_date'),
    initialData: [],
  });

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['all-users-filter'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: winningNumbers } = useQuery({
    queryKey: ['winning-numbers-latest'],
    queryFn: async () => {
      const results = await base44.entities.WinningNumbers.list('-created_date', 1);
      return results[0] || null;
    },
    initialData: null,
  });

  const publishSelectionsMutation = useMutation({
    mutationFn: async (selectionIds) => {
      for (const id of selectionIds) {
        await base44.entities.LotterySelection.update(id, { is_published: true });
      }
      
      await base44.entities.ActivityLog.create({
        user_id: currentAdminId,
        user_email: "admin",
        user_name: currentAdminName,
        action: "profile_update",
        details: `פרסום ${selectionIds.length} בחירות על ידי ${currentAdminName}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-selections-admin'] });
      setSelectedIds([]);
      alert("הבחירות פורסמו בהצלחה! ✅");
    },
  });

  const unpublishSelectionsMutation = useMutation({
    mutationFn: async (selectionIds) => {
      for (const id of selectionIds) {
        await base44.entities.LotterySelection.update(id, { is_published: false });
      }
      
      await base44.entities.ActivityLog.create({
        user_id: currentAdminId,
        user_email: "admin",
        user_name: currentAdminName,
        action: "profile_update",
        details: `הסרת פרסום מ-${selectionIds.length} בחירות על ידי ${currentAdminName}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-selections-admin'] });
      setSelectedIds([]);
      alert("הפרסום הוסר בהצלחה! ✅");
    },
  });

  const deleteSelectionsMutation = useMutation({
    mutationFn: async (selectionIds) => {
      for (const id of selectionIds) {
        // No need to fetch selection explicitly here, as `update` can handle it
        await base44.entities.LotterySelection.update(id, {
          deleted_by_admin: true,
          deleted_by_admin_date: new Date().toISOString(),
          deleted_by_admin_name: currentAdminName
        });
      }
      
      await base44.entities.ActivityLog.create({
        user_id: currentAdminId,
        user_email: "admin",
        user_name: currentAdminName,
        action: "lottery_submission_deleted",
        details: `מחיקת ${selectionIds.length} בחירות מפאנל פרסום על ידי ${currentAdminName}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-selections-admin'] });
      // Invalidate the general 'selections' query as well if it's used elsewhere for display
      queryClient.invalidateQueries({ queryKey: ['selections'] }); 
      setSelectedIds([]);
      setDeleteDialogOpen(false);
      alert("הבחירות נמחקו בהצלחה! ✅");
    },
  });

  const cancelAllPublishedMutation = useMutation({
    mutationFn: async () => {
      const publishedSelections = allSelections.filter(s => s.is_published);
      
      for (const selection of publishedSelections) {
        await base44.entities.LotterySelection.update(selection.id, { is_published: false });
      }
      
      await base44.entities.ActivityLog.create({
        user_id: currentAdminId,
        user_email: "admin",
        user_name: currentAdminName,
        action: "profile_update",
        details: `ביטול פרסום כל הבחירות (${publishedSelections.length} בחירות) על ידי ${currentAdminName}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-selections-admin'] });
      setSelectedIds([]);
      alert("הפרסום בוטל מכל הבחירות! ✅");
    },
  });

  const selectionsWithMatches = allSelections.map(selection => {
    if (!winningNumbers) return { ...selection, matches: 0 };
    
    const matches = selection.numbers.filter(num => 
      winningNumbers.numbers.includes(num)
    ).length;
    
    return { ...selection, matches };
  });

  const maxMatches = selectionsWithMatches.length > 0 
    ? Math.max(...selectionsWithMatches.map(s => s.matches))
    : 0;

  const filteredSelections = selectionsWithMatches.filter(selection => {
    // Exclude deleted selections from the filter
    if (selection.deleted_by_admin) return false;

    const matchesDateStart = !startDate || new Date(selection.created_date) >= new Date(startDate);
    const matchesDateEnd = !endDate || new Date(selection.created_date) <= new Date(endDate + 'T23:59:59');
    const matchesUser = selectedUser === "all" || selection.user_email === selectedUser;
    
    const selectionColor = selection.color_tag || "none";
    const matchesColor = colorFilter === "all" || selectionColor === colorFilter;
    
    return matchesDateStart && matchesDateEnd && matchesUser && matchesColor;
  });

  const handleToggleSelection = (id) => {
    // ✅ REMOVED: הסרתי את החסימה של אדום - עכשיו אפשר לבחור הכל
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    // ✅ CHANGED: עכשיו בוחר הכל כולל אדום
    if (selectedIds.length === filteredSelections.length && filteredSelections.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSelections.map(s => s.id));
    }
  };

  const handlePublishSelected = () => {
    if (selectedIds.length === 0) {
      alert("נא לבחור לפחות בחירה אחת");
      return;
    }
    
    const hasRed = filteredSelections.filter(s => selectedIds.includes(s.id))
      .some(s => s.color_tag === "red");
    
    if (hasRed) {
      alert("⚠️ לא ניתן לפרסם בחירות מסומנות באדום!\nהסר את הסימון האדום או בטל את הבחירה בהן.");
      return;
    }
    
    publishSelectionsMutation.mutate(selectedIds);
  };

  const handleUnpublishSelected = () => {
    if (selectedIds.length === 0) {
      alert("נא לבחור לפחות בחירה אחת");
      return;
    }
    unpublishSelectionsMutation.mutate(selectedIds);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      alert("נא לבחור לפחות בחירה אחת");
      return;
    }
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    deleteSelectionsMutation.mutate(selectedIds);
  };

  const handlePublishAll = () => {
    const selectionsToPublish = filteredSelections.filter(s => s.color_tag !== "red");
    const ids = selectionsToPublish.map(s => s.id);
    
    if (ids.length === 0) {
      alert("אין בחירות לפרסום (ייתכן שכולן מסומנות באדום או שאין בחירות מסוננות).");
      return;
    }
    
    const redCount = filteredSelections.filter(s => s.color_tag === "red").length;
    const message = redCount > 0 
      ? `האם לפרסם ${ids.length} בחירות?\n(${redCount} בחירות מסומנות באדום לא יפורסמו)`
      : `האם לפרסם ${ids.length} בחירות?`;
    
    if (confirm(message)) {
      publishSelectionsMutation.mutate(ids);
    }
  };

  const handleUnpublishAll = () => {
    const ids = filteredSelections.filter(s => s.is_published).map(s => s.id);
    if (ids.length === 0) {
      alert("אין בחירות מפורסמות להסיר");
      return;
    }
    if (confirm(`האם להסיר פרסום מ-${ids.length} בחירות?`)) {
      unpublishSelectionsMutation.mutate(ids);
    }
  };

  const handleCancelAllPublished = () => {
    const publishedCount = allSelections.filter(s => s.is_published).length;
    if (publishedCount === 0) {
      alert("אין בחירות מפורסמות לביטול");
      return;
    }
    if (confirm(`⚠️ האם אתה בטוח שברצונך לבטל את הפרסום מכל ${publishedCount} הבחירות המפורסמות?\n\nפעולה זו תסתיר את כל התוצאות מהמשתמשים.`)) {
      cancelAllPublishedMutation.mutate();
    }
  };

  const getColorClass = (colorValue) => {
    const option = colorOptions.find(opt => opt.value === colorValue);
    return option ? option.color : "bg-gray-200"; 
  };

  const uniqueUsers = [...new Set(allSelections.map(s => s.user_email))];

  return (
    <>
      <Card className="border-2 border-blue-200 shadow-xl" dir="rtl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-blue-200 p-4 md:p-6">
          <CardTitle className="text-lg md:text-2xl font-bold text-blue-900 flex items-center gap-2 justify-center md:justify-start">
            <Eye className="w-5 h-5 md:w-6 md:h-6" />
            ניהול פרסום בחירות
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6 space-y-4 md:space-y-6">
          {/* Filters */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 md:p-6 border-2 border-purple-200">
            <h3 className="text-base md:text-lg font-bold text-purple-900 mb-3 md:mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 md:w-5 md:h-5" />
              סינון בחירות
            </h3>
            
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
              <div>
                <Label htmlFor="start-date" className="font-semibold text-gray-700 text-sm md:text-sm mb-1 block">מתאריך</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border-2 border-purple-300 focus:border-purple-500 text-sm md:text-sm h-10 md:h-10"
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="font-semibold text-gray-700 text-sm md:text-sm mb-1 block">עד תאריך</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border-2 border-purple-300 focus:border-purple-500 text-sm md:text-sm h-10 md:h-10"
                />
              </div>
              <div>
                <Label htmlFor="user-select" className="font-semibold text-gray-700 text-sm md:text-sm mb-1 block">משתמש</Label>
                <select
                  id="user-select"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full border-2 border-purple-300 rounded-md p-2 focus:border-purple-500 focus:outline-none text-sm md:text-sm h-10 md:h-10 bg-white"
                >
                  <option value="all">כל המשתמשים</option>
                  {uniqueUsers.map(email => {
                    const user = users.find(u => u.email === email);
                    return (
                      <option key={email} value={email}>
                        {user?.display_name || user?.full_name || email}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <Label htmlFor="color-filter" className="font-semibold text-gray-700 text-sm md:text-sm mb-1 block">צבע</Label>
                <Select value={colorFilter} onValueChange={setColorFilter}>
                  <SelectTrigger id="color-filter" className="border-2 border-purple-300 focus:border-purple-500 text-sm md:text-sm h-10 md:h-10">
                    <SelectValue placeholder="בחר צבע" />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          {option.color && (
                            <div className={`w-4 h-4 rounded-full ${option.color} shadow-sm`}></div>
                          )}
                          <span className="text-sm">{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3 md:mt-4">
              <Button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setSelectedUser("all");
                  setColorFilter("all");
                }}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto border-2 border-purple-300 text-sm md:text-sm h-9 md:h-9"
              >
                נקה סינונים
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-3 md:p-6 border-2 border-amber-200">
            <h3 className="text-base md:text-lg font-bold text-amber-900 mb-3 md:mb-4">פעולות מהירות</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
              <Button
                onClick={handlePublishSelected}
                disabled={selectedIds.length === 0 || publishSelectionsMutation.isPending}
                size="sm"
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-sm md:text-sm h-10 md:h-9"
              >
                <Eye className="w-4 h-4 md:w-4 md:h-4 ml-1" />
                פרסם ({selectedIds.length})
              </Button>
              <Button
                onClick={handleUnpublishSelected}
                disabled={selectedIds.length === 0 || unpublishSelectionsMutation.isPending}
                size="sm"
                className="bg-gradient-to-r from-orange-500 to-red-400 hover:from-orange-600 hover:to-red-500 text-sm md:text-sm h-10 md:h-9"
              >
                <EyeOff className="w-4 h-4 md:w-4 md:h-4 ml-1" />
                הסר ({selectedIds.length})
              </Button>
              <Button
                onClick={handleDeleteSelected}
                disabled={selectedIds.length === 0 || deleteSelectionsMutation.isPending}
                size="sm"
                className="col-span-2 md:col-span-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-sm md:text-sm h-10 md:h-9"
              >
                <Trash2 className="w-4 h-4 md:w-4 md:h-4 ml-1" />
                מחק ({selectedIds.length})
              </Button>
            </div>

            <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t-2 border-amber-300">
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 md:p-4">
                <h4 className="text-sm md:text-lg font-bold text-red-900 mb-2 flex items-center gap-2 justify-center md:justify-start">
                  <AlertCircle className="w-4 h-4 md:w-5 md:h-5" />
                  ביטול פרסום כללי
                </h4>
                <p className="text-xs md:text-sm text-red-800 mb-3 md:mb-4 text-center md:text-right">
                  פעולה זו תבטל את הפרסום מכל הבחירות
                </p>
                <Button
                  onClick={handleCancelAllPublished}
                  disabled={cancelAllPublishedMutation.isPending}
                  size="sm"
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold shadow-lg text-sm md:text-sm h-10 md:h-10"
                >
                  <EyeOff className="w-4 h-4 md:w-4 md:h-4 ml-2" />
                  {cancelAllPublishedMutation.isPending ? "מבטל..." : "🚫 בטל פרסום הכל"}
                </Button>
              </div>
            </div>
          </div>

          {/* Selections List */}
          <div>
            {/* Mobile View - Cards */}
            <div className="md:hidden space-y-3">
              {loadingSelections ? (
                Array(3).fill(0).map((_, i) => (
                  <Card key={i} className="border-2 border-blue-200">
                    <CardContent className="p-3">
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))
              ) : filteredSelections.length === 0 ? (
                <Card className="border-2 border-gray-200">
                  <CardContent className="p-6 text-center text-gray-500 text-sm">
                    לא נמצאו בחירות
                  </CardContent>
                </Card>
              ) : (
                filteredSelections.map((selection) => {
                  const user = users.find(u => u.email === selection.user_email);
                  const isWinner = winningNumbers && selection.matches === maxMatches && maxMatches > 0;
                  const colorTag = selection.color_tag || "none";
                  const isRedTagged = colorTag === "red";
                  
                  return (
                    <Card 
                      key={selection.id} 
                      className={`border-2 ${
                        isWinner ? "border-yellow-400 bg-yellow-50" : 
                        isRedTagged ? "border-red-300 bg-red-50 opacity-70" : 
                        "border-blue-200"
                      }`}
                    >
                      <CardContent className="p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedIds.includes(selection.id)}
                              onCheckedChange={() => handleToggleSelection(selection.id)}
                              // Removed disabled={isRedTagged} here
                            />
                            <div 
                              className={`w-5 h-5 rounded-full ${getColorClass(colorTag)} shadow-md border-2 ${
                                isRedTagged ? "border-red-600" : "border-gray-300"
                              }`}
                              title={colorOptions.find(c => c.value === colorTag)?.label || "ללא צבע"}
                            />
                          </div>
                          
                          {selection.is_published ? (
                            <Badge className="bg-green-500 text-white text-xs">
                              <Eye className="w-3 h-3 ml-1" />
                              מפורסם
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-400 text-white text-xs">
                              <EyeOff className="w-3 h-3 ml-1" />
                              מוסתר
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isWinner && (
                            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 animate-pulse" />
                          )}
                          {isRedTagged && (
                            <span className="text-red-600 font-bold">🚫</span>
                          )}
                          <span className={`font-bold text-lg ${isRedTagged ? "text-red-600 line-through" : "text-purple-900"}`}>
                            {selection.nickname}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="truncate">
                            {user?.display_name || user?.full_name || selection.user_name}
                          </span>
                        </div>

                        <div className="flex gap-1 flex-wrap">
                          {selection.numbers.sort((a, b) => a - b).map((num) => {
                            const isMatch = winningNumbers?.numbers.includes(num);
                            return (
                              <Badge
                                key={num}
                                className={`font-bold text-sm px-2 py-1 ${
                                  isMatch
                                    ? "bg-gradient-to-br from-green-500 to-emerald-500 text-white"
                                    : "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                                }`}
                              >
                                {num}
                              </Badge>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            <span>📅 {new Date(selection.created_date).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                          </div>
                          {winningNumbers && (
                            <Badge 
                              className={`text-sm font-bold ${
                                selection.matches === 0 
                                  ? "bg-gray-300 text-gray-700"
                                  : selection.matches >= 4
                                  ? "bg-gradient-to-br from-green-500 to-emerald-500 text-white"
                                  : "bg-gradient-to-br from-blue-500 to-cyan-500 text-white"
                              }`}
                            >
                              פגיעות: {selection.matches}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden md:block border-2 border-blue-200 rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-blue-100 to-cyan-100">
                    <TableHead className="font-bold text-blue-900 w-12 text-sm p-4">
                      <Checkbox
                        checked={selectedIds.length === filteredSelections.length && filteredSelections.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="font-bold text-blue-900 w-12 text-center text-sm p-4">צבע</TableHead>
                    <TableHead className="font-bold text-blue-900 text-sm p-4">כינוי</TableHead>
                    <TableHead className="font-bold text-blue-900 text-sm p-4">משתמש</TableHead>
                    <TableHead className="font-bold text-blue-900 text-sm p-4">מספרים</TableHead>
                    {winningNumbers && (
                      <TableHead className="font-bold text-blue-900 text-center text-sm p-4">פגיעות</TableHead>
                    )}
                    <TableHead className="font-bold text-blue-900 text-center text-sm p-4">סטטוס</TableHead>
                    <TableHead className="font-bold text-blue-900 text-center text-sm p-4">תאריך</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSelections ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="p-4"><Skeleton className="h-4 w-4" /></TableCell>
                        <TableCell className="p-4"><Skeleton className="h-4 w-4 rounded-full" /></TableCell>
                        <TableCell className="p-4"><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell className="p-4"><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell className="p-4"><Skeleton className="h-4 w-48" /></TableCell>
                        {winningNumbers && <TableCell className="p-4"><Skeleton className="h-6 w-12" /></TableCell>}
                        <TableCell className="p-4"><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell className="p-4"><Skeleton className="h-4 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredSelections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={winningNumbers ? 8 : 7} className="text-center py-12 text-gray-500">
                        לא נמצאו בחירות
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSelections.map((selection) => {
                      const user = users.find(u => u.email === selection.user_email);
                      const isWinner = winningNumbers && selection.matches === maxMatches && maxMatches > 0;
                      const colorTag = selection.color_tag || "none";
                      const isRedTagged = colorTag === "red";
                      
                      return (
                        <TableRow 
                          key={selection.id} 
                          className={`hover:bg-blue-50 transition-colors ${
                            isWinner ? "bg-yellow-50" : isRedTagged ? "bg-red-50 opacity-60" : ""
                          }`}
                        >
                          <TableCell className="p-4">
                            <Checkbox
                              checked={selectedIds.includes(selection.id)}
                              onCheckedChange={() => handleToggleSelection(selection.id)}
                              // Removed disabled={isRedTagged} here
                            />
                          </TableCell>
                          <TableCell className="text-center p-4">
                            <div className="flex justify-center">
                              <div 
                                className={`w-5 h-5 rounded-full ${getColorClass(colorTag)} shadow-md border ${
                                  isRedTagged ? "border-red-600" : "border-gray-300"
                                }`}
                                title={colorOptions.find(c => c.value === colorTag)?.label || "ללא צבע"}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="p-4">
                            <div className="flex items-center gap-2">
                              {isWinner && (
                                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 animate-pulse" />
                              )}
                              {isRedTagged && (
                                <span className="text-red-600 font-bold text-xs">🚫</span>
                              )}
                              <span className={`font-bold text-sm ${isRedTagged ? "text-red-600 line-through" : "text-purple-900"}`}>
                                {selection.nickname}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="p-4">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-700 text-sm">
                                {user?.display_name || user?.full_name || selection.user_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="p-4">
                            <div className="flex gap-1 flex-wrap">
                              {selection.numbers.sort((a, b) => a - b).map((num) => {
                                const isMatch = winningNumbers?.numbers.includes(num);
                                return (
                                  <Badge
                                    key={num}
                                    className={`font-bold text-sm px-2 py-0.5 ${
                                      isMatch
                                        ? "bg-gradient-to-br from-green-500 to-emerald-500 text-white"
                                        : "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                                    }`}
                                  >
                                    {num}
                                  </Badge>
                                );
                              })}
                            </div>
                          </TableCell>
                          {winningNumbers && (
                            <TableCell className="text-center p-4">
                              <Badge 
                                className={`text-base font-bold ${
                                  selection.matches === 0 
                                    ? "bg-gray-300 text-gray-700"
                                    : selection.matches >= 4
                                    ? "bg-gradient-to-br from-green-500 to-emerald-500 text-white"
                                    : "bg-gradient-to-br from-blue-500 to-cyan-500 text-white"
                                }`}
                              >
                                {selection.matches}
                              </Badge>
                            </TableCell>
                          )}
                          <TableCell className="text-center p-4">
                            {isRedTagged ? (
                              <Badge className="bg-red-500 text-white text-sm">
                                🚫 לא לפרסם
                              </Badge>
                            ) : selection.is_published ? (
                              <Badge className="bg-green-500 text-white text-sm">
                                <Eye className="w-3 h-3 ml-1" />
                                מפורסם
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-400 text-white text-sm">
                                <EyeOff className="w-3 h-3 ml-1" />
                                מוסתר
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-sm text-gray-600 p-4">
                            📅 {new Date(selection.created_date).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: '2-digit' })}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <Trash2 className="w-6 h-6 text-red-600" />
              מחיקת בחירות
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p className="font-bold text-base text-gray-900">
                  האם אתה בטוח שברצונך למחוק {selectedIds.length} בחירות?
                </p>
                <Alert className="bg-red-50 border-red-300">
                  <AlertDescription className="text-red-800 font-semibold text-sm">
                    ⚠️ <strong>שים לב:</strong> הבחירות יוסתרו מפאנל הניהול אך יישארו גלויות למשתמשים בהיסטוריה שלהם.
                  </AlertDescription>
                </Alert>
                <Alert className="bg-blue-50 border-blue-300">
                  <AlertDescription className="text-blue-800 text-sm">
                    💡 <strong>טיפ:</strong> ניתן למחוק גם בחירות אדומות וגם ישנות בפעולה זו.
                  </AlertDescription>
                </Alert>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteSelectionsMutation.isPending}
              className="bg-red-600 hover:bg-red-700 font-bold"
            >
              {deleteSelectionsMutation.isPending ? "מוחק..." : "🗑️ מחק בחירות"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
