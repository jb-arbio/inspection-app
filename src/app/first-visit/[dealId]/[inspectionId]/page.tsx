import VisitNavigator from './VisitNavigator';
import { SurveyConfigProvider } from '@/lib/firstVisit/SurveyConfigContext';

export default async function SurveyPage({
  params,
}: { params: Promise<{ dealId: string; inspectionId: string }> }) {
  const { dealId, inspectionId } = await params;
  return (
    <SurveyConfigProvider>
      <VisitNavigator dealId={dealId} inspectionId={inspectionId} />
    </SurveyConfigProvider>
  );
}
