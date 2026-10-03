'use client';
import { useState } from 'react';
import { api, date, useResource } from './api';
import { fileSize, uploadToDrive } from './drive-upload';
type Folder = { id: string; name: string; parent_id: string | null };
type DriveFile = { id: string; folder_id: string | null; name: string; content_type: string; size: number; visibility: 'public' | 'private'; share_token: string | null; created_at: string };
type Listing = { folder: Folder | null; folders: Folder[]; files: DriveFile[]; usage: number; limit: number; can_write: boolean };
const MAX_FILE_SIZE = 10 * 1024 ** 3;

function Uploader({ folderId, done }: { folderId: string | null; done: () => void }) {
  const [active, setActive] = useState<{ name: string; fraction: number } | null>(null); const [message, setMessage] = useState(''); const [over, setOver] = useState(false);
  async function add(list: FileList | null) {
    const files = Array.from(list || []); if (!files.length || active) return; const failed: string[] = [];
    for (const file of files) {
      if (!file.size || file.size > MAX_FILE_SIZE) { failed.push(file.name); continue; }
      setActive({ name: file.name, fraction: 0 });
      try { await uploadToDrive(file, folderId, fraction => setActive({ name: file.name, fraction })); } catch { failed.push(file.name); }
    }
    setActive(null); setMessage(failed.length ? `Not uploaded: ${failed.join(', ')}. Each file must be 10 GB or smaller.` : `${files.length} file${files.length === 1 ? '' : 's'} uploaded.`); done();
  }
  return <div className="panel" style={over ? { borderColor: '#426d55' } : undefined} onDragOver={event => { event.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={event => { event.preventDefault(); setOver(false); add(event.dataTransfer.files); }}>
    <label>Add files<input type="file" multiple disabled={!!active} onChange={event => { add(event.target.files); event.target.value = ''; }} /></label>
    <p className="muted">Drop files here or select them. Maximum size for each file: 10 GB. Keep this page open during an upload.</p>
    {active && <p role="status">Uploading {active.name} <progress max={1} value={active.fraction} /> {Math.round(active.fraction * 100)}%</p>}
    <p role="status">{message}</p>
  </div>;
}

function FileRow({ file, canWrite, change }: { file: DriveFile; canWrite: boolean; change: (action: Promise<unknown>) => void }) {
  const [copied, setCopied] = useState('');
  const patch = (body: Record<string, unknown>) => change(api(`/api/admin/drive/files/${file.id}`, { method: 'PATCH', body: JSON.stringify(body) }));
  async function copy(path: string, label: string) { await navigator.clipboard.writeText(window.location.origin + path); setCopied(label); }
  return <tr>
    <td><a href={`/files/${file.id}`} target="_blank" rel="noreferrer">{file.name}</a><small>{fileSize(file.size)} · {date(file.created_at)}</small></td>
    <td>{canWrite ? <select aria-label={`Visibility of ${file.name}`} value={file.visibility} onChange={event => patch({ visibility: event.target.value })}><option value="private">Private</option><option value="public">Public</option></select> : file.visibility}</td>
    <td><div className="studio-actions">
      <button className="button" onClick={() => copy(`/files/${file.id}`, 'Link copied.')}>Copy link</button>
      {file.share_token && <button className="button" onClick={() => copy(`/share/${file.share_token}`, 'Share link copied.')}>Copy share link</button>}
      {canWrite && <button className="button" onClick={() => patch({ shared: !file.share_token })}>{file.share_token ? 'Cancel share link' : 'Create share link'}</button>}
      {canWrite && <button className="button danger" onClick={() => { if (window.confirm(`Delete ${file.name}? You cannot undo this.`)) change(api(`/api/admin/drive/files/${file.id}`, { method: 'DELETE' })); }}>Delete</button>}
    </div><span role="status">{copied}</span></td>
  </tr>;
}

export default function Drive() {
  const [folderId, setFolderId] = useState<string | null>(null); const [search, setSearch] = useState(''); const [name, setName] = useState(''); const [issue, setIssue] = useState('');
  const query = new URLSearchParams({ ...(folderId ? { folder: folderId } : {}), ...(search ? { q: search } : {}) });
  const { data, error, reload } = useResource<Listing>(`/api/admin/drive?${query}`);
  const change = (action: Promise<unknown>) => { setIssue(''); action.then(reload).catch((failure: Error) => setIssue(failure.message)); };
  function addFolder(event: React.FormEvent) { event.preventDefault(); change(api('/api/admin/drive/folders', { method: 'POST', body: JSON.stringify({ name, parent_id: folderId }) }).then(() => setName(''))); }
  const open = (id: string | null) => { setFolderId(id); setSearch(''); };
  return <>
    {data && <p className="muted">{fileSize(data.usage)} of {fileSize(data.limit)} used <progress max={data.limit} value={data.usage} /></p>}
    <div className="filters"><label>Search all files<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
    {(error || issue) && <p className="notice error" role="alert">{error || issue} <button className="button" onClick={reload}>Try again</button></p>}
    {!data && !error && <p role="status">Loading files…</p>}
    {data && <>
      <h2>{search ? 'Search results' : data.folder ? data.folder.name : 'All folders'}</h2>
      {!search && <div className="studio-actions" style={{ marginBottom: 24 }}>
        {data.folder && <button className="button" onClick={() => open(data.folder!.parent_id)}>Up one level</button>}
        {data.folders.map(folder => <button className="button" key={folder.id} onClick={() => open(folder.id)}>{folder.name}</button>)}
      </div>}
      {data.can_write && !search && <>
        <Uploader folderId={folderId} done={reload} />
        <form className="filters" onSubmit={addFolder}><label>New folder name<input required maxLength={120} value={name} onChange={event => setName(event.target.value)} /></label><button className="button">Create folder</button>{data.folder && <button type="button" className="button danger" onClick={() => change(api(`/api/admin/drive/folders/${data.folder!.id}`, { method: 'DELETE' }).then(() => open(data.folder!.parent_id)))}>Delete this folder</button>}</form>
      </>}
      {data.files.length === 0 ? <div className="empty">{search ? 'No files match your search.' : 'No files in this folder.'}</div> : <div className="table-wrap"><table><thead><tr><th>File</th><th>Visibility</th><th>Links</th></tr></thead><tbody>{data.files.map(file => <FileRow key={file.id} file={file} canWrite={data.can_write} change={change} />)}</tbody></table></div>}
    </>}
  </>;
}
