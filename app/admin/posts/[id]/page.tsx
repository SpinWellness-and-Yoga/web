import PostEditor from '../../_components/post-editor';
export default async function EditPost({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <PostEditor id={id} />; }
