import { useMemo, useState } from "react";

export default function CreateGroupModal({ open, users = [], onClose, onCreate }) {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [groupImageFile, setGroupImageFile] = useState(null);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => {
      const name = (user.displayName || user.username || "").toLowerCase();
      return name.includes(query);
    });
  }, [users, search]);

  if (!open) return null;

  const toggle = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onCreate({
      groupName: groupName.trim(),
      description: description.trim(),
      memberIds: selectedIds,
      groupImageFile
    });
    setGroupName("");
    setDescription("");
    setSearch("");
    setSelectedIds([]);
    setGroupImageFile(null);
  };

  return (
    <div className="modal-backdrop">
      <section className="modal-panel">
        <h3>Create Group</h3>
        <form onSubmit={handleSubmit} className="group-form">
          <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" required />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Group description"
            rows={3}
          />
          <label className="ghost-btn small">
            {groupImageFile ? groupImageFile.name : "Upload group image"}
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              hidden
              onChange={(event) => setGroupImageFile(event.target.files?.[0] || null)}
            />
          </label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users" />
          <div className="group-user-picker">
            {filteredUsers.map((user) => (
              <label key={user.id} className="group-user-option">
                <input type="checkbox" checked={selectedIds.includes(user.id)} onChange={() => toggle(user.id)} />
                <span>{user.displayName || user.username}</span>
              </label>
            ))}
          </div>
          <div className="modal-actions">
            <button type="button" className="ghost-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              Create
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
