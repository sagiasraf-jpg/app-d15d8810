
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Mail, Phone, Edit2, Check, X, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { motion, AnimatePresence } from "framer-motion";

export default function ProfileSection({ user, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(true);
  const [isPaymentOpen, setIsPaymentOpen] = useState(true);

  const queryClient = useQueryClient();

  // Query for payment record
  const { data: paymentRecord } = useQuery({
    queryKey: ['payment-record', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const records = await base44.entities.UserPaymentRecord.filter({ user_email: user.email });
      return records[0] || null;
    },
    enabled: !!user?.email,
    initialData: null,
  });

  const paymentInfo = paymentRecord ? {
    totalForms: paymentRecord.total_forms_submitted,
    paidForms: paymentRecord.paid_forms,
    unpaidForms: paymentRecord.total_forms_submitted - paymentRecord.paid_forms,
  } : null;

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
      
      await base44.entities.ActivityLog.create({
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        action: "profile_update",
        details: `עדכון פרופיל: ${data.nickname ? 'כינוי, ' : ''}${data.phone ? 'טלפון' : ''}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selections'] });
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      if (onUpdate) onUpdate();
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate({
      nickname: nickname.trim(),
      phone: phone.trim(),
    });
  };

  const handleCancel = () => {
    setNickname(user?.nickname || "");
    setPhone(user?.phone || "");
    setIsEditing(false);
  };

  return (
    <>
      {/* Payment Info Card - WITH COLLAPSIBLE - ONLY IF unpaidForms > 0 */}
      {paymentInfo && paymentInfo.totalForms > 0 && paymentInfo.unpaidForms > 0 && (
        <Collapsible open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 shadow-lg mb-4">
            <CollapsibleTrigger asChild>
              <CardHeader className="bg-gradient-to-r from-blue-100 to-cyan-100 border-b-2 border-blue-200 p-4 cursor-pointer hover:bg-blue-50 transition-colors">
                <CardTitle className="text-blue-900 text-lg font-bold flex items-center justify-between">
                  <span>מספר טפסים שלא שולמו</span>
                  {isPaymentOpen ? (
                    <ChevronUp className="w-5 h-5 text-blue-700" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-blue-700" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="p-4 md:p-5">
                {/* Single Number Display */}
                <div className="text-center bg-white rounded-lg p-5 border-2 border-blue-300">
                  <p className="text-5xl md:text-6xl font-black text-blue-600">
                    {paymentInfo.unpaidForms}
                  </p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Profile Card - WITH COLLAPSIBLE */}
      <Collapsible open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <Card className="bg-white shadow-lg border-purple-100">
          <CollapsibleTrigger asChild>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-blue-100 p-4 cursor-pointer hover:bg-blue-50 transition-colors">
              <CardTitle className="flex items-center justify-between text-blue-900">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  <span className="text-lg">הפרופיל שלי</span>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="border-blue-300 text-blue-600 hover:bg-blue-50 text-sm h-9"
                    >
                      <Edit2 className="w-4 h-4 ml-1" />
                      ערוך
                    </Button>
                  )}
                  {isProfileOpen ? (
                    <ChevronUp className="w-5 h-5 text-blue-700" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-blue-700" />
                  )}
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="p-4 space-y-4">
              <AnimatePresence>
                {showSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Alert className="bg-green-50 border-green-300">
                      <Check className="h-5 w-5 text-green-600" />
                      <AlertDescription className="text-green-800 font-semibold text-base">
                        הפרופיל עודכן בהצלחה! ✓
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Name */}
              <div className="bg-blue-50 rounded-lg p-3 md:p-4 border border-blue-200">
                <Label className="text-sm text-gray-500 mb-1 block">שם מלא</Label>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <p className="font-semibold text-gray-900 text-base md:text-lg">{user?.display_name || user?.full_name}</p>
                </div>
              </div>

              {/* Email */}
              <div className="bg-blue-50 rounded-lg p-3 md:p-4 border border-blue-200">
                <Label className="text-sm text-gray-500 mb-1 block">אימייל</Label>
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <p className="text-gray-700 text-base break-all">{user?.email}</p>
                </div>
              </div>

              {/* Nickname - Editable */}
              <div>
                <Label htmlFor="nickname" className="text-gray-700 font-semibold mb-2 block text-base">
                  כינוי (אופציונלי)
                </Label>
                {isEditing ? (
                  <Input
                    id="nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="הזן כינוי..."
                    className="border-2 border-blue-300 focus:border-blue-500 text-base h-12"
                  />
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3 md:p-4 border border-gray-200">
                    <p className="text-gray-700 text-base">{user?.nickname || "לא הוגדר"}</p>
                  </div>
                )}
              </div>

              {/* Phone - Editable */}
              <div>
                <Label htmlFor="phone" className="text-gray-700 font-semibold mb-2 block text-base">
                  טלפון (אופציונלי)
                </Label>
                {isEditing ? (
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="050-1234567"
                      className="pr-12 border-2 border-blue-300 focus:border-blue-500 text-base h-12"
                      dir="ltr"
                    />
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3 md:p-4 border border-gray-200">
                    <p className="text-gray-700 text-base" dir="ltr">{user?.phone || "לא הוגדר"}</p>
                  </div>
                )}
              </div>

              {/* Edit Actions */}
              {isEditing && (
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold text-base h-12"
                  >
                    <Check className="w-5 h-5 ml-1" />
                    {updateProfileMutation.isPending ? "שומר..." : "שמור"}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="border-2 border-gray-400 text-gray-700 hover:bg-gray-100 text-base h-12 px-6"
                  >
                    <X className="w-5 h-5 ml-1" />
                    ביטול
                  </Button>
                </div>
              )}

              {!user?.nickname && !isEditing && (
                <Alert className="bg-amber-50 border-amber-300">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-base">
                    <strong>💡 טיפ:</strong> הוסף כינוי כדי לזהות את הבחירות שלך בקלות
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </>
  );
}
