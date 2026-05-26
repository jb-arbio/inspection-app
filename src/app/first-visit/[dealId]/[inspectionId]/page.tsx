import SurveyFlow from './SurveyFlow';

export default async function SurveyPage({
  params,
}: { params: Promise<{ dealId: string; inspectionId: string }> }) {
  const { dealId, inspectionId } = await params;
  return <SurveyFlow dealId={dealId} inspectionId={inspectionId} />;
}
