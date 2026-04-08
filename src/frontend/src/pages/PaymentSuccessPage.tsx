import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle } from "lucide-react";

export default function PaymentSuccessPage() {
  const navigate = useNavigate();

  return (
    <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Thank you for your purchase. Your premium features are now active.
          </p>
          <Button onClick={() => navigate({ to: "/" })} className="w-full">
            Continue to App
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
