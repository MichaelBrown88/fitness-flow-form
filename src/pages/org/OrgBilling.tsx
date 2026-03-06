import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, TrendingUp, ArrowRight } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

export default function OrgBilling() {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto pb-12 sm:pb-20">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Manage Subscription</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Upgrade your plan or contact support</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={() => navigate(ROUTES.SETTINGS)}>
              <SettingsIcon className="w-4 h-4 mr-2" />
              Organization Settings
            </Button>
            <Button
              variant="outline"
              className="w-full border-gradient-dark text-gradient-dark hover:bg-gradient-light"
              onClick={() => {
                alert('Plan upgrade flow coming soon. Please contact support for plan changes.');
              }}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Upgrade Plan
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
