import EventEditor from '../../_components/event-editor';
export default async function EditEvent({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <EventEditor id={id} />; }
