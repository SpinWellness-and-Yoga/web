export default function Pagination({ page, count, change }: { page: number; count: number; change: (page: number) => void }) {
 return <div className="save-bar"><p className="muted">Page {page + 1} · {count} items</p><div className="studio-actions"><button className="button" disabled={page === 0} onClick={() => change(page - 1)}>Previous</button><button className="button" disabled={count < 50} onClick={() => change(page + 1)}>Next</button></div></div>;
}
