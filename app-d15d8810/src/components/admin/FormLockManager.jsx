
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Clock, Lock, Unlock, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function FormLockManager({ currentAdminId, currentAdminName }) {
  const [closeDate, setCloseDate] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['publish-settings'],
    queryFn: async () => {
      const result = await base44.entities.PublishSettings.list('-created_date', 1);
      return result[0] || null;
    },
    initialData: null,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async ({ closeDateTime, isFormOpen }) => {
      const data = {
        form_close_date: closeDateTime,
        is_form_open: isFormOpen,
        form_locked_by_admin_id: currentAdminId,
        form_locked_by_admin_name: currentAdminName
      };

      if (settings?.id) {
        await base44.entities.PublishSettings.update(settings.id, data);
      } else {
        await base44.entities.PublishSettings.create({
          ...data,
          publish_date: new Date().toISOString(),
          is_published: false
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publish-settings'] });
      alert("ההגדרות נשמרו בהצלחה! ✅");
    },
  });

  const handleSetCloseTime = async () => {
    if (!closeDate || !closeTime) {
      alert("נא למלא תאריך ושעה");
      return;
    }

    const closeDateTime = new Date(`${closeDate}T${closeTime}`).toISOString();
    await updateSettingsMutation.mutateAsync({
      closeDateTime,
      isFormOpen: true
    });
    setCloseDate("");
    setCloseTime("");
  };

  const handleToggleForm = async (isOpen) => {
    if (!settings) {
      alert("נא להגדיר תאריך ושעה תחילה");
      return;
    }

    await updateSettingsMutation.mutateAsync({
      closeDateTime: settings.form_close_date || new Date().toISOString(),
      isFormOpen: isOpen
    });
  };

  const isCloseTimeReached = () => {
    if (!settings?.form_close_date) return false;
    return new Date() >= new Date(settings.form_close_date);
  };

  const isFormCurrentlyOpen = settings?.is_form_open !== false;
  const shouldFormBeLocked = isCloseTimeReached() && isFormCurrentlyOpen;

  return (
    <Card className="border-2 border-amber-200 shadow-xl" dir="rtl">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b-2 border-amber-200">
        <CardTitle className="text-lg md:text-2xl font-bold text-amber-900 flex items-center gap-2">
          {isFormCurrentlyOpen ? (
            <Unlock className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
          ) : (
            <Lock className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
          )}
          <span className="text-base md:text-2xl">נעילת/פתיחת טופס</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Current Status */}
        {settings && (
          <Alert className={isFormCurrentlyOpen ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}>
            <AlertCircle className={`h-4 w-4 md:h-5 md:w-5 ${isFormCurrentlyOpen ? "text-green-600" : "text-red-600"}`} />
            <AlertDescription className={`${isFormCurrentlyOpen ? "text-green-800" : "text-red-800"} text-xs md:text-base`}>
              <div className="space-y-2">
                <p className="font-bold text-lg">
                  {isFormCurrentlyOpen ? "✅ הטופס פתוח למילוי" : "🔒 הטופס נעול - משתמשים לא יכולים למלא"}
                </p>
                {settings.form_close_date && (
                  <p className="text-sm">
                    <strong>תאריך ושעה מתוכננת לנעילה:</strong>{" "}
                    {format(new Date(settings.form_close_date), "dd/MM/yyyy בשעה HH:mm", { locale: he })}
                  </p>
                )}
                {shouldFormBeLocked && (
                  <p className="text-amber-700 font-semibold">
                    ⚠️ הגיע זמן הנעילה האוטומטית! לחץ "נעל טופס" כדי למנוע מילוי חדש
                  </p>
                )}
                {settings.form_locked_by_admin_name && (
                  <p className="text-xs text-gray-600">
                    עודכן לאחרונה ע"י: {settings.form_locked_by_admin_name}
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Set Close Time */}
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-4 md:p-6 border-2 border-amber-200">
          <h3 className="text-base md:text-lg font-bold text-amber-900 mb-3 md:mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 md:w-5 md:h-5" />
            קבע תאריך ושעה לנעילה
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
            <div>
              <Label htmlFor="close-date" className="font-semibold text-gray-700 text-xs md:text-sm">תאריך נעילה</Label>
              <Input
                id="close-date"
                type="date"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
                className="mt-1 border-amber-300 focus:border-amber-500 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="close-time" className="font-semibold text-gray-700 text-xs md:text-sm">שעת נעילה</Label>
              <Input
                id="close-time"
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="mt-1 border-amber-300 focus:border-amber-500 text-sm"
              />
            </div>
          </div>

          <Button
            onClick={handleSetCloseTime}
            disabled={updateSettingsMutation.isPending}
            size="sm"
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs md:text-sm"
          >
            <Clock className="w-3 h-3 md:w-4 md:h-4 ml-2" />
            {updateSettingsMutation.isPending ? "שומר..." : "שמור תאריך"}
          </Button>
        </div>

        {/* Manual Lock/Unlock Controls */}
        {settings && (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 md:p-6 border-2 border-blue-200">
            <h3 className="text-base md:text-lg font-bold text-blue-900 mb-3 md:mb-4">נעילה/פתיחה ידנית</h3>
            <p className="text-xs md:text-sm text-gray-700 mb-3 md:mb-4">
              ניתן לנעול או לפתוח בכל עת
            </p>
            <div className="flex gap-2 md:gap-3">
              <Button
                onClick={() => handleToggleForm(false)}
                disabled={updateSettingsMutation.isPending || !isFormCurrentlyOpen}
                size="sm"
                className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold text-xs md:text-sm"
              >
                <Lock className="w-3 h-3 md:w-4 md:h-4 ml-1" />
                נעל 🔒
              </Button>
              <Button
                onClick={() => handleToggleForm(true)}
                disabled={updateSettingsMutation.isPending || isFormCurrentlyOpen}
                size="sm"
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-xs md:text-sm"
              >
                <Unlock className="w-3 h-3 md:w-4 md:h-4 ml-1" />
                פתח 🔓
              </Button>
            </div>
          </div>
        )}

        {/* Info Box */}
        <Alert className="bg-amber-50 border-amber-300">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-xs md:text-sm">
            <p className="font-semibold mb-2">💡 איך זה עובד:</p>
            <ul className="mr-4 space-y-1 text-xs">
              <li>• קבע תאריך ושעה מתי הטופס יינעל אוטומטית</li>
              <li>• לחילופין, ניתן לנעול/לפתוח את הטופס ידנית בכל עת</li>
              <li>• כשהטופס נעול - משתמשים יראו הודעה שהטופס סגור</li>
              <li>• ניתן לפתוח את הטופס מחדש בכל רגע</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
