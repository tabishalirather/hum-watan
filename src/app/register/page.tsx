import { MenteeRegisterForm } from "@/features/auth/components/mentee-register-form";
import { MentorRegisterForm } from "@/features/auth/components/mentor-register-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

export default function RegisterPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="mentee">
            <TabsList className="w-full">
              <TabsTrigger value="mentee" className="flex-1">
                Mentee
              </TabsTrigger>
              <TabsTrigger value="mentor" className="flex-1">
                Mentor
              </TabsTrigger>
            </TabsList>
            <TabsContent value="mentee" className="pt-4">
              <MenteeRegisterForm />
            </TabsContent>
            <TabsContent value="mentor" className="pt-4">
              <MentorRegisterForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
