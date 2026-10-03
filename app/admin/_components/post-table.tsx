import Link from 'next/link';
import type { Post } from '../../../lib/cms/types';
import { date } from './api';
export default function PostTable({ posts }: { posts: Post[] }) { return posts.length ? <div className="table-wrap"><table><thead><tr><th>Story</th><th>Status</th><th>Last edited</th><th><span className="muted">Action</span></th></tr></thead><tbody>{posts.map(post => <tr key={post.id}><td>{post.title}<small>{post.category}</small></td><td><span className="badge">{post.status}</span></td><td>{date(post.updated_at)}</td><td><Link href={`/admin/posts/${post.id}`} aria-label={`Edit ${post.title}`}>Edit</Link></td></tr>)}</tbody></table></div> : <div className="empty"><h2>No posts to show.</h2><p>Create a post or change your filters.</p></div>; }
