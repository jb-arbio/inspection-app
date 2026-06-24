import VisitNavigator from './VisitNavigator';
import { SurveyConfigLoader } from '@/lib/firstVisit/SurveyConfigLoader';

export default async function SurveyPage({
  params,
}: { params: Promise<{ dealId: string; inspectionId: string }> }) {
  const { dealId, inspectionId } = await params;
  return (
    <SurveyConfigLoader>
      <VisitNavigator dealId={dealId} inspectionId={inspectionId} />
    </SurveyConfigLoader>
  );
}
