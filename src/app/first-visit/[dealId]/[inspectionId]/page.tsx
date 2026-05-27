import VisitNavigator from './VisitNavigator';

export default async function SurveyPage({
  params,
}: { params: Promise<{ dealId: string; inspectionId: string }> }) {
  const { dealId, inspectionId } = await params;
  return <VisitNavigator dealId={dealId} inspectionId={inspectionId} />;
}
