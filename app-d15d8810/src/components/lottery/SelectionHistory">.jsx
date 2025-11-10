import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { History, Calendar, Clock, Send, Trash2, User } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { motion } from "framer-motion";

export default function SelectionHistory({ selections, isLoading, onResendNumbers, onDeleteSelection }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectionToDelete, setSelectionToDelete] = useState(null);

  const handleDeleteClick = (selection) => {
    setSelectionToDelete(selection);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectionToDelete && onDeleteSelection) {
      onDeleteSelection(selectionToDelete.id);
    }
    setDeleteDialogOpen(false);
    setSelectionToDelete(null);
  };

  if (isLoading) {
    return (
      <Card className="bg-white shadow-lg border-purple-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <History className="w-5 h-5" />
            <span>היסטוריית בחירות</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white shadow-lg border-purple-100">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-100">
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <History className="w-5 h-5" />
            <span>היסטוריית בחירות</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {selections.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-gray-500 text-lg">עדיין אין בחירות</p>
              <p className="text-gray-400 text-sm mt-1">התחל לבחור מספרים כדי לראות את ההיסטוריה שלך</p>
            </div>
          ) : (
            <>
              {selections.map((selection, index) => (
                <motion.div
                  key={selection.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border-2 border-purple-200 hover:shadow-md transition-shadow relative"
                >
                  <button
                    onClick={() => handleDeleteClick(selection)}
                    className="absolute top-2 left-2 w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors shadow-sm"
                    title="מחק בחירה"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-between mb-3 pr-8">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-purple-600" />
                      <span className="font-bold text-purple-900">{selection.nickname}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>
                        {format(new Date(selection.created_date), "HH:mm")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(new Date(selection.created_date), "d בMMMM yyyy", { locale: he })}
                    </span>
                  </div>
                  
                  <div className="flex gap-2 flex-wrap mb-3">
                    {selection.numbers.sort((a, b) => a - b).map((num) => (
                      <Badge
                        key={num}
                        className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-base px-3 py-1 shadow-md"
                      >
                        {num}
                      </Badge>
                    ))}
                  </div>
                  
                  {selection.notes && (
                    <p className="text-sm text-gray-600 mb-3 italic">{selection.notes}</p>
                  )}

                  {onResendNumbers && (
                    <Button
                      onClick={() => onResendNumbers(selection.numbers, selection.nickname)}
                      size="sm"
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold shadow-md"
                    >
                      <Send className="w-4 h-4 ml-2" />
                      שלח שוב עם הכינוי "{selection.nickname}" 🔄
                    </Button>
                  )}
                  
                  {!onResendNumbers && (
                    <div className="text-center text-sm text-gray-500 py-2 bg-gray-100 rounded">
                      🔒 הטופס נעול - לא ניתן לשלוח מחדש
                    </div>
                  )}
                </motion.div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              מחיקת בחירה
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3">
                <p>האם אתה בטוח שברצונך למחוק את הבחירה הזו?</p>
                {selectionToDelete && (
                  <div className="bg-purple-50 rounded-lg p-3 border-2 border-purple-200">
                    <p className="text-sm text-purple-900 mb-2 font-bold flex items-center gap-2">
                      <User className="w-4 h-4" />
                      כינוי: {selectionToDelete.nickname}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      📅 {format(new Date(selectionToDelete.created_date), "d בMMMM yyyy בשעה HH:mm", { locale: he })}
                    </p>
                    <div className="flex gap-1 flex-wrap">
                      {selectionToDelete.numbers.sort((a, b) => a - b).map((num) => (
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
                <p className="text-red-600 font-semibold text-sm">
                  ⚠️ פעולה זו אינה ניתנת לביטול!
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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