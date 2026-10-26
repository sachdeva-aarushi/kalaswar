import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useLang, type Lang } from "@/lib/i18n";
import { organiseStoryNotes } from "@/lib/story-organiser";
import { saveCraftStory, setStoryConsent, storiesForArtisanQuery, productsQuery } from "@/lib/data";
import { canShowMakerName } from "@/lib/story";
import { formatDate } from "@/lib/money";
import { CONSENT_TYPES, type ConsentType, type CraftStory, type CraftStoryStatus } from "@/lib/types";
import { DemoNote } from "@/components/demo-note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface StoryDraftState {
  id?: string;
  title: string;
  body: string;
  notes: string;
  language: Lang;
  aiAssisted: boolean;
  status: CraftStoryStatus;
  productId: string | null;
}

const EMPTY_DRAFT: StoryDraftState = {
  title: "",
  body: "",
  notes: "",
  language: "en",
  aiAssisted: false,
  status: "draft",
  productId: null,
};

/**
 * "My craft story" — the maker writes (or dictates) raw notes, an AI draft
 * can be prepared from those notes only, and she edits and approves every
 * word. Publishing records her approval; consent switches are separate and
 * can be withdrawn at any time.
 */
export function StoryEditorSection({
  artisanId,
  artisanName,
  craft,
  shgId,
  shgName,
}: {
  artisanId: string;
  artisanName: string;
  craft: string;
  shgId: string | null;
  shgName: string | null;
}) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { data: stories } = useQuery(storiesForArtisanQuery(artisanId));
  const { data: allProducts } = useQuery(productsQuery());
  const myProducts = (allProducts ?? []).filter((p) => p.artisan?.id === artisanId);
  const [draft, setDraft] = useState<StoryDraftState>(EMPTY_DRAFT);
  const [editing, setEditing] = useState(false);
  const [consentOn, setConsentOn] = useState<Set<ConsentType>>(new Set());

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["craftStories", artisanId] });
    queryClient.invalidateQueries({ queryKey: ["craftStoriesPublished"] });
    queryClient.invalidateQueries({ queryKey: ["craftStoryForProduct"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (status: CraftStoryStatus) => {
      const story = await saveCraftStory({
        ...(draft.id ? { id: draft.id } : {}),
        artisan_id: artisanId,
        shg_id: shgId,
        product_id: draft.productId,
        title: draft.title,
        body: draft.body,
        language: draft.language,
        status,
        original_notes: draft.notes || null,
        ai_assisted: draft.aiAssisted,
        approved_by: status === "published" ? artisanName : null,
      });
      if (draft.id) {
        // Re-assert the maker's current consent selections on update.
        for (const type of CONSENT_TYPES) {
          await setStoryConsent(story.id, type, consentOn.has(type), artisanName);
        }
      }
      return story;
    },
    onSuccess: (story, status) => {
      setDraft((d) => (d.id ? d : { ...d, id: story.id, status }));
      invalidate();
      toast.success(status === "published" ? t("story_published") : t("story_saved"));
    },
    onError: () => toast.error(t("common_error")),
  });

  const consentMutation = useMutation({
    mutationFn: ({ type, granted }: { type: ConsentType; granted: boolean }) =>
      setStoryConsent(draft.id!, type, granted, artisanName),
    onMutate: ({ type, granted }) =>
      setConsentOn((prev) => {
        const next = new Set(prev);
        if (granted) next.add(type);
        else next.delete(type);
        return next;
      }),
    onSuccess: () => {
      invalidate();
    },
    onError: () => toast.error(t("common_error")),
  });

  const organiseMutation = useMutation({
    mutationFn: () =>
      organiseStoryNotes({ data: { notes: draft.notes, lang: draft.language, craft } }),
    onSuccess: (draftResult) => {
      setDraft((d) => ({ ...d, title: draftResult.title, body: draftResult.body, aiAssisted: true }));
    },
    onError: () => toast.error(t("common_error")),
  });

  const loadStory = (s: CraftStory & { consents?: { consent_type: ConsentType; granted: boolean }[] }) => {
    setDraft({
      id: s.id,
      title: s.title,
      body: s.body,
      notes: s.original_notes ?? "",
      language: (s.language as Lang) ?? "en",
      aiAssisted: s.ai_assisted,
      status: s.status,
      productId: s.product_id ?? null,
    });
    setConsentOn(new Set((s.consents ?? []).filter((c) => c.granted).map((c) => c.consent_type)));
    setEditing(true);
  };

  const saved = Boolean(draft.id);
  const hasNotes = draft.notes.trim().length > 0;
  const canPublish = draft.title.trim() && draft.body.trim() && (hasNotes || draft.body.trim());

  const statusChip = (status: CraftStoryStatus) => {
    const key =
      status === "published" ? "story_status_published" : status === "retired" ? "story_status_retired" : "story_status_draft";
    return (
      <span
        className={cn(
          "rounded-sm px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
          status === "published" ? "bg-leaf/10 text-leaf" : "bg-secondary text-secondary-foreground",
        )}
      >
        {t(key)}
      </span>
    );
  };

  return (
    <section className="rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl leading-snug text-foreground">{t("story_title")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("story_sub")}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setDraft(EMPTY_DRAFT);
            setConsentOn(new Set());
            setEditing(true);
          }}
        >
          <Plus className="size-4" aria-hidden="true" /> {t("story_new")}
        </Button>
      </div>

      {/* Her existing stories */}
      {!editing && (
        <ul className="mt-3 space-y-2">
          {(stories ?? []).length === 0 && (
            <li className="text-sm text-muted-foreground">{t("story_none")}</li>
          )}
          {(stories ?? []).map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => loadStory(s)}
                className="w-full rounded-md border border-border bg-card p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-foreground">{s.title}</span>
                  {statusChip(s.status)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("story_updated")} {formatDate(s.updated_at)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Editor */}
      {editing && (
        <div className="mt-6 space-y-6 border-t border-border pt-6">
          <div className="space-y-1.5">
            <Label htmlFor="story-notes">{t("story_notes_label")}</Label>
            <Textarea
              id="story-notes"
              rows={4}
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder={t("story_notes_ph")}
            />
            <p className="text-xs text-muted-foreground">{t("story_original_kept")}</p>
          </div>

          <Button
            size="sm"
            variant="outline"
            disabled={!hasNotes || organiseMutation.isPending}
            onClick={() => organiseMutation.mutate()}
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {organiseMutation.isPending ? t("story_organising") : t("story_organise")}
          </Button>

          {draft.aiAssisted && (
            <p className="rounded-sm border border-gold/40 bg-secondary px-3 py-2 text-xs text-secondary-foreground">
              {t("story_ai_badge")}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="story-title">{t("story_title_label")}</Label>
            <Input
              id="story-title"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="story-body">{t("story_body_label")}</Label>
            <Textarea
              id="story-body"
              rows={7}
              value={draft.body}
              onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
            />
          </div>
          <div className="max-w-40 space-y-1.5">
            <Label htmlFor="story-lang">{t("story_lang")}</Label>
            <Select
              value={draft.language}
              onValueChange={(v) => setDraft((d) => ({ ...d, language: v as Lang }))}
            >
              <SelectTrigger id="story-lang" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिन्दी</SelectItem>
                <SelectItem value="mr">मराठी</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="max-w-56 space-y-1.5">
            <Label htmlFor="story-product">{t("story_link_product")}</Label>
            <Select
              value={draft.productId ?? "none"}
              onValueChange={(v) => setDraft((d) => ({ ...d, productId: v === "none" ? null : v }))}
            >
              <SelectTrigger id="story-product" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {myProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Consents — only meaningful once the story is saved */}
          {saved ? (
            <div>
              <p className="text-sm font-semibold text-foreground">{t("story_consent_title")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("story_consent_sub")}</p>
              <ul className="mt-2 space-y-1.5">
                {CONSENT_TYPES.map((type) => (
                  <li key={type}>
                    <label className="flex items-center gap-3 rounded-md border border-border bg-background p-3 text-sm leading-relaxed text-foreground">
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 accent-primary"
                        checked={consentOn.has(type)}
                        onChange={(e) =>
                          consentMutation.mutate({ type, granted: e.target.checked })
                        }
                      />
                      {t(`consent_${type}`)}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <DemoNote>{t("story_consent_after_save")}</DemoNote>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!canPublish || saveMutation.isPending}
              onClick={() => saveMutation.mutate("draft")}
            >
              {t("story_save_draft")}
            </Button>
            <Button
              size="sm"
              disabled={!canPublish || saveMutation.isPending}
              onClick={() => saveMutation.mutate("published")}
            >
              {t("story_publish")}
            </Button>
            {saved && draft.status === "published" && (
              <Button
                size="sm"
                variant="ghost"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate("retired")}
              >
                {t("story_retire")}
              </Button>
            )}
          </div>

          {saved && (
            <p className="text-xs text-muted-foreground">
              {t("stories_made_by")}:{" "}
              {canShowMakerName(
                CONSENT_TYPES.filter((c) => consentOn.has(c)).map((c) => ({ consent_type: c, granted: true })),
                artisanName,
              )
                ? artisanName
                : (shgName ?? "—")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
