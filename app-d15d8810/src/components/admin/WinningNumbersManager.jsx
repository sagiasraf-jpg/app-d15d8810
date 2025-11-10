
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trophy, Plus, Trash2, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
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

const TOTAL_NUMBERS = 37;
const REQUIRED_COUNT = 6;

export default function WinningNumbersManager({ currentAdminId, currentAdminName }) {
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [drawDate, setDrawDate] = useState("");
  const [weekDescription, setWeekDescription] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [winningToDelete, setWinningToDelete] = useState(null);
  const queryClient = useQueryClient();

  const { data: winningNumbers, isLoading } = useQuery({
    queryKey: ['winning-numbers'],
    queryFn: () => base44.entities.WinningNumbers.list('-created_date', 10),
    initialData: [],
  });

  const publishWinningMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.WinningNumbers.create({
        numbers: selectedNumbers,
        draw_date: drawDate,
        week_description: weekDescription || `הגרלה ${format(new Date(drawDate), "dd/MM/yyyy", { locale: he })}`,
        published_by_admin_id: currentAdminId,
        published_by_admin_name: currentAdminName,
        is_active: true
      });

      // Log activity
      await base44.entities.ActivityLog.create({
        user_id: currentAdminId,
        user_email: "admin",
        user_name: currentAdminName,
        action: "profile_update",
        details: `פרסום מספרים זוכים: ${selectedNumbers.join(', ')} לתאריך ${drawDate}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['winning-numbers'] });
      setSelectedNumbers([]);
      setDrawDate("");
      setWeekDescription("");
      alert("המספרים הזוכים פורסמו בהצלחה! 🏆");
    },
  });

  const deleteWinningMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.WinningNumbers.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['winning-numbers'] });
      setDeleteDialogOpen(false);
      setWinningToDelete(null);
    },
  });

  const handleNumberClick = (number) => {
    if (selectedNumbers.includes(number)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== number));
    } else if (selectedNumbers.length < REQUIRED_COUNT) {
      setSelectedNumbers([...selectedNumbers, number].sort((a, b) => a - b));
    }
  };

  const handleClear = () => {
    setSelectedNumbers([]);
  };

  const handlePublish = () => {
    if (selectedNumbers.length !== REQUIRED_COUNT) {
      alert("נא לבחור בדיוק 6 מספרים");
      return;
    }
    if (!drawDate) {
      alert("נא לבחור תאריך הגרלה");
      return;
    }
    publishWinningMutation.mutate();
  };

  const handleDeleteClick = (winning) => {
    setWinningToDelete(winning);
    setDeleteDialogOpen(true);
  };

  const isNumberSelected = (number) => selectedNumbers.includes(number);

  return (
    <>
      <Card className="border-2 border-red-300 shadow-xl" dir="rtl">
        <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b-2 border-red-300">
          <CardTitle className="text-lg md:text-2xl font-bold text-red-900 flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 md:w-7 md:h-7" />
            פרסום מספרים זוכים
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6 space-y-4 md:space-y-6">
          {/* Current Selection */}
          <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-4 md:p-6 border-2 border-red-300">
            <h3 className="text-base md:text-lg font-bold text-red-900 mb-3 md:mb-4 text-center">בחר את המספרים הזוכים</h3>
            
            {/* Counter */}
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <span className="text-base md:text-lg font-bold text-gray-700">
                נבחרו {selectedNumbers.length} מתוך {REQUIRED_COUNT}
              </span>
              <div className="flex gap-1 flex-row-reverse">
                {Array.from({ length: REQUIRED_COUNT }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-colors duration-300 ${
                      i < selectedNumbers.length
                        ? "bg-gradient-to-r from-red-500 to-red-600 shadow-md"
                        : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Selected Numbers Display */}
            {selectedNumbers.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap mb-3 md:mb-4 justify-center">
                <span className="text-xs md:text-sm text-gray-600 font-semibold">המספרים שנבחרו:</span>
                <div className="flex gap-1 md:gap-2 flex-row-reverse flex-wrap justify-center">
                  {selectedNumbers.map(num => (
                    <Badge
                      key={num}
                      className="bg-gradient-to-br from-red-500 to-red-600 text-white font-bold text-sm md:text-lg px-2 md:px-4 py-1 shadow-md"
                    >
                      {num}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Number Grid - Responsive */}
            <div className="grid grid-cols-6 sm:grid-cols-7 gap-1 md:gap-2 lg:gap-3 mb-3 md:mb-4" dir="rtl">
              {Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1).map((number) => {
                const isSelected = isNumberSelected(number);
                return (
                  <button
                    key={number}
                    onClick={() => handleNumberClick(number)}
                    className={`
                      aspect-square rounded-lg md:rounded-xl font-bold text-sm md:text-lg transition-all duration-200
                      ${isSelected
                        ? "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg scale-105 ring-2 md:ring-4 ring-red-300"
                        : "bg-white border-2 border-gray-200 text-gray-700 hover:border-red-400 hover:bg-red-50 shadow-sm"
                      }
                    `}
                  >
                    {number}
                  </button>
                );
              })}
            </div>

            {/* Date and Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
              <div>
                <Label htmlFor="draw-date" className="font-semibold text-gray-700 mb-2 block text-xs md:text-sm">
                  תאריך הגרלה <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="draw-date"
                  type="date"
                  value={drawDate}
                  onChange={(e) => setDrawDate(e.target.value)}
                  className="border-red-300 focus:border-red-500 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="week-desc" className="font-semibold text-gray-700 mb-2 block text-xs md:text-sm">
                  תיאור השבוע (אופציונלי)
                </Label>
                <Input
                  id="week-desc"
                  placeholder="שבוע 3 - ינואר 2025"
                  value={weekDescription}
                  onChange={(e) => setWeekDescription(e.target.value)}
                  className="border-red-300 focus:border-red-500 text-sm"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 md:gap-3">
              <Button
                onClick={handleClear}
                variant="outline"
                size="sm"
                className="flex-1 border-2 border-red-400 text-red-700 hover:bg-red-100 text-xs md:text-sm"
                disabled={selectedNumbers.length === 0}
              >
                נקה
              </Button>
              <Button
                onClick={handlePublish}
                disabled={selectedNumbers.length !== REQUIRED_COUNT || !drawDate || publishWinningMutation.isPending}
                size="sm"
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold shadow-lg text-xs md:text-sm"
              >
                <Trophy className="w-3 h-3 md:w-4 md:h-4 ml-2" />
                {publishWinningMutation.isPending ? "מפרסם..." : "פרסם"}
              </Button>
            </div>
          </div>

          {/* Published Winning Numbers History */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 md:p-6 border-2 border-purple-200">
            <h3 className="text-base md:text-lg font-bold text-purple-900 mb-3 md:mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 md:w-5 md:h-5" />
              היסטוריית הגרלות
            </h3>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">טוען...</p>
              </div>
            ) : winningNumbers.length === 0 ? (
              <Alert className="bg-white border-purple-300">
                <AlertCircle className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-800">
                  עדיין לא פורסמו מספרים זוכים
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {winningNumbers.map((winning) => (
                  <div
                    key={winning.id}
                    className="bg-white rounded-lg p-4 border-2 border-purple-200 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-lg text-gray-900">
                          {winning.week_description || `הגרלה ${format(new Date(winning.draw_date), "dd/MM/yyyy", { locale: he })}`}
                        </p>
                        <p className="text-sm text-gray-600">
                          📅 {format(new Date(winning.draw_date), "d בMMMM yyyy", { locale: he })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          פורסם ע"י: {winning.published_by_admin_name || "מנהל"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(winning)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex gap-2 flex-wrap flex-row-reverse">
                      {winning.numbers.sort((a, b) => a - b).map((num) => (
                        <Badge
                          key={num}
                          className="bg-gradient-to-br from-red-500 to-red-600 text-white font-bold text-lg px-4 py-1 shadow-md"
                        >
                          {num}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <Alert className="bg-red-50 border-red-300">
            <CheckCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 text-xs md:text-sm">
              <p className="font-semibold mb-2">💡 איך זה עובד:</p>
              <ul className="mr-4 space-y-1 text-xs">
                <li>• בחר 6 מספרים (1-37)</li>
                <li>• הזן תאריך הגרלה</li>
                <li>• לחץ "פרסם" והמספרים יופיעו לכולם</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              מחיקת הגרלה
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3">
                <p>האם אתה בטוח שברצונך למחוק את ההגרלה הזו?</p>
                {winningToDelete && (
                  <div className="bg-purple-50 rounded-lg p-3 border-2 border-purple-200">
                    <p className="font-semibold text-gray-900 mb-2">
                      {winningToDelete.week_description}
                    </p>
                    <div className="flex gap-1 flex-wrap flex-row-reverse">
                      {winningToDelete.numbers.sort((a, b) => a - b).map((num) => (
                        <Badge
                          key={num}
                          className="bg-gradient-to-br from-red-500 to-red-600 text-white font-bold"
                        >
                          {num}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-red-600 font-semibold text-sm">
                  ⚠️ פעולה זו אינה ניתנת לביטול!
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteWinningMutation.mutate(winningToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
