import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Check, PencilLine, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  createContact,
  deleteContact,
  isValidSolanaAddress,
  listContacts,
  updateContact,
  type Contact,
} from "@/lib/contacts";

type Draft = {
  name: string;
  wallet: string;
};

type ContactsManagerProps = {
  userId: string | null;
  compact?: boolean;
};

function truncateWallet(address: string, chars = 4) {
  if (address.length <= chars * 2 + 3) {
    return address;
  }

  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

function initialDraft(contact?: Contact): Draft {
  return {
    name: contact?.name ?? "",
    wallet: contact?.wallet ?? "",
  };
}

function ContactSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`animate-pulse rounded-lg border border-border/60 bg-surface/60 ${compact ? "p-3" : "p-4"}`}
    >
      <div className="h-4 w-24 rounded bg-border/70" />
      <div className="mt-2 h-3 w-full rounded bg-border/60" />
      <div className="mt-3 h-8 w-24 rounded bg-border/60" />
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  label,
  tone = "default",
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        tone === "danger"
          ? "border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function ContactsManager({ userId, compact = false }: ContactsManagerProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newDraft, setNewDraft] = useState<Draft>({ name: "", wallet: "" });
  const [newSaving, setNewSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<Draft>({ name: "", wallet: "" });
  const [editingSaving, setEditingSaving] = useState(false);

  const hasContacts = contacts.length > 0;
  const visibleContacts = useMemo(
    () => (compact ? contacts.slice(0, 4) : contacts),
    [compact, contacts],
  );

  useEffect(() => {
    if (!userId) {
      setContacts([]);
      setError(null);
      setShowForm(false);
      setEditingId(null);
      return;
    }

    void loadContacts(userId);
  }, [userId]);

  async function loadContacts(currentUserId: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await listContacts(currentUserId);
      setContacts(response.contacts);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(contact: Contact) {
    setEditingId(contact.id);
    setEditingDraft(initialDraft(contact));
    setShowForm(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingDraft({ name: "", wallet: "" });
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();

    if (!userId) {
      toast.error("Connect a wallet first");
      return;
    }

    const name = newDraft.name.trim();
    const wallet = newDraft.wallet.trim();

    if (!name || !wallet) {
      toast.error("Enter a contact name and wallet");
      return;
    }

    if (!isValidSolanaAddress(wallet)) {
      toast.error("Enter a valid Solana wallet address");
      return;
    }

    setNewSaving(true);
    try {
      const response = await createContact(userId, { name, wallet });
      if (response.contact) {
        setContacts((current) => [response.contact!, ...current]);
      }
      setNewDraft({ name: "", wallet: "" });
      setShowForm(false);
      toast.success(`Saved @${name}`);
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "Failed to save contact");
    } finally {
      setNewSaving(false);
    }
  }

  async function handleSaveEdit(contactId: string) {
    if (!userId) {
      toast.error("Connect a wallet first");
      return;
    }

    const name = editingDraft.name.trim();
    const wallet = editingDraft.wallet.trim();

    if (!name || !wallet) {
      toast.error("Enter a contact name and wallet");
      return;
    }

    if (!isValidSolanaAddress(wallet)) {
      toast.error("Enter a valid Solana wallet address");
      return;
    }

    setEditingSaving(true);
    try {
      const response = await updateContact(userId, contactId, { name, wallet });
      if (response.contact) {
        setContacts((current) =>
          current.map((contact) => (contact.id === contactId ? response.contact! : contact)),
        );
      }
      cancelEdit();
      toast.success(`Updated @${name}`);
    } catch (requestError) {
      toast.error(
        requestError instanceof Error ? requestError.message : "Failed to update contact",
      );
    } finally {
      setEditingSaving(false);
    }
  }

  async function handleDelete(contactId: string, contactName: string) {
    if (!userId) {
      toast.error("Connect a wallet first");
      return;
    }

    const ok = window.confirm(`Delete @${contactName}?`);
    if (!ok) {
      return;
    }

    try {
      await deleteContact(userId, contactId);
      setContacts((current) => current.filter((contact) => contact.id !== contactId));
      toast.success(`Deleted @${contactName}`);
    } catch (requestError) {
      toast.error(
        requestError instanceof Error ? requestError.message : "Failed to delete contact",
      );
    }
  }

  const wrapperClassName = compact ? "space-y-4" : "space-y-6";
  const titleClassName = compact
    ? "text-sm font-medium text-foreground"
    : "text-base font-medium text-foreground";

  if (!userId) {
    return (
      <div className={wrapperClassName}>
        <div className={titleClassName}>Contacts</div>
        <p className="text-xs text-muted-foreground">Connect your wallet to save contacts.</p>
      </div>
    );
  }

  return (
    <div className={wrapperClassName}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className={titleClassName}>Contacts</div>
          <p className={`mt-0.5 text-xs text-muted-foreground ${compact ? "max-w-[180px]" : ""}`}>
            Save people once and reuse them in commands.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-surface focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Add new
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="space-y-3 rounded-lg border border-border bg-surface/80 p-3"
        >
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="contact-name">
              Name
            </label>
            <input
              id="contact-name"
              value={newDraft.name}
              onChange={(event) =>
                setNewDraft((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="pooja"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="contact-wallet">
              Wallet
            </label>
            <input
              id="contact-wallet"
              value={newDraft.wallet}
              onChange={(event) =>
                setNewDraft((current) => ({ ...current, wallet: event.target.value }))
              }
              placeholder="7YxQzK9p..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={newSaving}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-glow disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Check className="h-3.5 w-3.5" />
              {newSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setNewDraft({ name: "", wallet: "" });
              }}
              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          <ContactSkeleton compact={compact} />
          <ContactSkeleton compact={compact} />
        </div>
      ) : error ? (
        <div className="space-y-3 rounded-lg border border-border bg-surface/70 p-3 text-sm text-muted-foreground">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void loadContacts(userId)}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs text-foreground transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : hasContacts ? (
        <div className={`space-y-3 ${compact ? "max-h-[340px] overflow-auto pr-1" : ""}`}>
          {visibleContacts.map((contact) => {
            const editing = editingId === contact.id;

            return (
              <div
                key={contact.id}
                className="rounded-lg border border-border/70 bg-surface/70 p-3"
              >
                {editing ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label
                        className="text-xs text-muted-foreground"
                        htmlFor={`contact-name-${contact.id}`}
                      >
                        Name
                      </label>
                      <input
                        id={`contact-name-${contact.id}`}
                        value={editingDraft.name}
                        onChange={(event) =>
                          setEditingDraft((current) => ({ ...current, name: event.target.value }))
                        }
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        className="text-xs text-muted-foreground"
                        htmlFor={`contact-wallet-${contact.id}`}
                      >
                        Wallet
                      </label>
                      <input
                        id={`contact-wallet-${contact.id}`}
                        value={editingDraft.wallet}
                        onChange={(event) =>
                          setEditingDraft((current) => ({ ...current, wallet: event.target.value }))
                        }
                        className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={editingSaving}
                        onClick={() => void handleSaveEdit(contact.id)}
                        className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-glow disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {editingSaving ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="font-medium text-foreground">@{contact.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {truncateWallet(contact.wallet)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <ActionButton
                        label={`Edit ${contact.name}`}
                        onClick={() => startEdit(contact)}
                      >
                        <PencilLine className="h-3.5 w-3.5" />
                      </ActionButton>
                      <ActionButton
                        label={`Delete ${contact.name}`}
                        tone="danger"
                        onClick={() => void handleDelete(contact.id, contact.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </ActionButton>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {compact && contacts.length > visibleContacts.length && (
            <p className="text-xs text-muted-foreground">
              +{contacts.length - visibleContacts.length} more saved contacts
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/70 bg-surface/50 p-3 text-sm text-muted-foreground">
          No saved contacts yet. Add one to reuse it in commands.
        </div>
      )}
    </div>
  );
}
