import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Clock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function PublishManager({ currentAdminId, currentAdminName }) {
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['publish-settings'],
    queryFn: async () => {
      const result = await base44.entities.PublishSettings.list('-created_date', 1);
      return result[0] || null;
    },
    initialData: null,
  });

  const createOrUpdateSettingsMutation = useMutation({
    mutationFn: async ({ publishStartDateTime, publishEndDateTime, isPublished }) => {
      const data = {
        publish_start_date: publishStartDateTime,
        publish_end_date: publishEndDateTime,
        is_published: isPublished,
        published_by_admin_id: currentAdminId,
        published_by_admin_name: currentAdminName
      };

      if (settings?.id) {
        await base44.entities.PublishSettings.update(settings.id, data);
      } else {
        await base44.entities.PublishSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publish-settings'] });
      alert("ההגדרות נשמרו בהצלחה! ✅");
    },
  });

  const handleSetPublishTime = async () => {
    if (!startDate || !startTime) {
      alert("נא למלא תאריך ושעת התחלה");
      return;
    }

    if (!endDate || !endTime) {
      alert("נא למלא תאריך ושעת סיום");
      return;
    }

    const publishStartDateTime = new Date(`${startDate}T${startTime}`).toISOString();
    const publishEndDateTime = new Date(`${endDate}T${endTime}`).toISOString();

    // בדיקה שתאריך הסיום אחרי תאריך ההתחלה
    if (new Date(publishEndDateTime) <= new Date(publishStartDateTime)) {
      alert("תאריך הסיום חייב להיות אחרי תאריך ההתחלה");
      return;
    }

    await createOrUpdateSettingsMutation.mutateAsync({
      publishStartDateTime,
      publishEndDateTime,
      isPublished: false
    });
    setStartDate("");
    setStartTime("");
    setEndDate("");
    setEndTime("");
  };

  const handleTogglePublish = async (isPublished) => {
    if (!settings?.publish_start_date || !settings?.publish_end_date) {
      alert("נא להגדיר תאריכים ושעות תחילה");
      return;
    }

    await createOrUpdateSettingsMutation.mutateAsync({
      publishStartDateTime: settings.publish_start_date,
      publishEndDateTime: settings.publish_end_date,
      isPublished
    });
  };

  const isPublishStartTimeReached = () => {
    if (!settings?.publish_start_date) return false;
    return new Date() >= new Date(settings.publish_start_date);
  };

  const isPublishEndTimeReached = () => {
    if (!settings?.publish_end_date) return false;
    return new Date() >= new Date(settings.publish_end_date);
  };

  const isInPublishWindow = () => {
    if (!settings?.publish_start_date || !settings?.publish_end_date) return false;
    const now = new Date();
    return now >= new Date(settings.publish_start_date) && now <= new Date(settings.publish_end_date);
  };

  // Check if dates are valid
  const hasValidDates = settings?.publish_start_date && settings?.publish_end_date;

  return (
    <Card className="border-2 border-purple-200 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-200">
        <CardTitle className="text-2xl font-bold text-purple-900 flex items-center gap-2">
          <Eye className="w-6 h-6" />
          ניהול פרסום תוצאות
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Current Status */}
        {settings && hasValidDates && (
          <Alert className={settings.is_published ? "bg-green-50 border-green-300" : "bg-blue-50 border-blue-300"}>
            <AlertCircle className={`h-5 w-5 ${settings.is_published ? "text-green-600" : "text-blue-600"}`} />
            <AlertDescription className={settings.is_published ? "text-green-800" : "text-blue-800"}>
              <div className="space-y-2">
                <p className="font-bold text-lg">
                  {settings.is_published ? "✅ התוצאות פורסמו" : "⏳ התוצאות לא פורסמו"}
                </p>
                
                {/* Start Date with highlighted time */}
                <div className="bg-white rounded-lg p-3 border-2 border-blue-200">
                  <p className="text-sm font-semibold text-gray-700 mb-1">📅 תאריך התחלת פרסום:</p>
                  <p className="text-base">
                    {format(new Date(settings.publish_start_date), "dd/MM/yyyy", { locale: he })}
                    {" "}
                    <span className="font-bold text-xl text-blue-700 bg-blue-100 px-3 py-1 rounded-lg">
                      🕐 {format(new Date(settings.publish_start_date), "HH:mm", { locale: he })}
                    </span>
                  </p>
                </div>

                {/* End Date with highlighted time */}
                <div className="bg-white rounded-lg p-3 border-2 border-purple-200">
                  <p className="text-sm font-semibold text-gray-700 mb-1">📅 תאריך סיום פרסום:</p>
                  <p className="text-base">
                    {format(new Date(settings.publish_end_date), "dd/MM/yyyy", { locale: he })}
                    {" "}
                    <span className="font-bold text-xl text-purple-700 bg-purple-100 px-3 py-1 rounded-lg">
                      🕐 {format(new Date(settings.publish_end_date), "HH:mm", { locale: he })}
                    </span>
                  </p>
                </div>

                {/* Status messages */}
                {isInPublishWindow() && !settings.is_published && (
                  <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
                    <p className="text-green-700 font-semibold flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      ⏰ אנחנו בתוך חלון הפרסום! לחץ "פרסם עכשיו" כדי להפעיל
                    </p>
                  </div>
                )}
                
                {!isPublishStartTimeReached() && (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3">
                    <p className="text-amber-700 font-semibold">
                      ⏳ הפרסום יתחיל בתאריך ושעה שהוגדרו
                    </p>
                  </div>
                )}

                {isPublishEndTimeReached() && settings.is_published && (
                  <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-3">
                    <p className="text-orange-700 font-semibold">
                      ⚠️ חלון הפרסום הסתיים! אולי כדאי להסתיר את התוצאות
                    </p>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Info if no dates set yet */}
        {settings && !hasValidDates && (
          <Alert className="bg-amber-50 border-amber-300">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <p className="font-bold text-lg mb-2">⏰ טרם הוגדרו תאריכי פרסום</p>
              <p className="text-sm">נא להגדיר תאריך התחלה וסיום למטה</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Set Publish Time Range */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border-2 border-purple-200">
          <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            קבע טווח תאריכים ושעות לפרסום
          </h3>
          
          {/* Start Date & Time */}
          <div className="mb-6">
            <Label className="text-base font-bold text-gray-800 mb-3 block">
              🟢 תחילת פרסום
            </Label>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date" className="font-semibold text-gray-700">תאריך התחלה</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 border-purple-300 focus:border-purple-500"
                />
              </div>
              <div>
                <Label htmlFor="start-time" className="font-semibold text-gray-700">
                  <Clock className="w-4 h-4 inline ml-1" />
                  שעת התחלה
                </Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 border-purple-300 focus:border-purple-500 text-lg font-bold"
                />
              </div>
            </div>
          </div>

          {/* End Date & Time */}
          <div className="mb-6">
            <Label className="text-base font-bold text-gray-800 mb-3 block">
              🔴 סיום פרסום
            </Label>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="end-date" className="font-semibold text-gray-700">תאריך סיום</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 border-purple-300 focus:border-purple-500"
                />
              </div>
              <div>
                <Label htmlFor="end-time" className="font-semibold text-gray-700">
                  <Clock className="w-4 h-4 inline ml-1" />
                  שעת סיום
                </Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 border-purple-300 focus:border-purple-500 text-lg font-bold"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleSetPublishTime}
            disabled={createOrUpdateSettingsMutation.isPending}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold"
          >
            <Clock className="w-4 h-4 ml-2" />
            {createOrUpdateSettingsMutation.isPending ? "שומר..." : "שמור טווח תאריכים ושעות"}
          </Button>
        </div>

        {/* Manual Publish Controls */}
        {settings && hasValidDates && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-6 border-2 border-amber-200">
            <h3 className="text-lg font-bold text-amber-900 mb-4">פרסום ידני</h3>
            <p className="text-sm text-gray-700 mb-4">
              ניתן לפרסם או להסתיר את התוצאות בכל עת, ללא תלות בתאריכים שהוגדרו
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => handleTogglePublish(true)}
                disabled={createOrUpdateSettingsMutation.isPending || settings.is_published}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold"
              >
                <Eye className="w-4 h-4 ml-2" />
                פרסם עכשיו
              </Button>
              <Button
                onClick={() => handleTogglePublish(false)}
                disabled={createOrUpdateSettingsMutation.isPending || !settings.is_published}
                variant="outline"
                className="flex-1 border-2 border-red-300 text-red-700 hover:bg-red-50 font-bold"
              >
                <EyeOff className="w-4 h-4 ml-2" />
                הסתר תוצאות
              </Button>
            </div>
          </div>
        )}

        {/* Info Box */}
        <Alert className="bg-purple-50 border-purple-300">
          <AlertCircle className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-800 text-sm">
            <p className="font-semibold mb-2">💡 איך זה עובד:</p>
            <ul className="mr-4 space-y-1 text-xs">
              <li>• קבע <strong>תאריך ושעת התחלה</strong> - מתי הפרסום יתחיל</li>
              <li>• קבע <strong>תאריך ושעת סיום</strong> - מתי הפרסום יסתיים</li>
              <li>• השעות <strong>מודגשות בבירור</strong> לנוחיותך</li>
              <li>• לחץ "פרסם עכשיו" כדי להציג את כל הטפסים לכולם</li>
              <li>• המשתמשים יראו דף "כל התוצאות" עם הבחירות של כולם</li>
              <li>• ניתן להסתיר את התוצאות בכל עת</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}