import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

interface WikiFavorite {
  id: string;
  item_type: "folder" | "page";
  item_id: string;
}

export const useWikiFavorites = () => {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const [favorites, setFavorites] = useState<WikiFavorite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user || !currentOrg) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("wiki_favorites")
        .select("id, item_type, item_id")
        .eq("user_id", user.id)
        .eq("organization_id", currentOrg.id);

      if (error) throw error;
      setFavorites(
        (data || []).map((item) => ({
          ...item,
          item_type: item.item_type as "folder" | "page",
        }))
      );
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  }, [user, currentOrg]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const isFavorite = useCallback(
    (itemType: "folder" | "page", itemId: string) => {
      return favorites.some(
        (f) => f.item_type === itemType && f.item_id === itemId
      );
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (itemType: "folder" | "page", itemId: string) => {
      if (!user || !currentOrg) return;

      const existing = favorites.find(
        (f) => f.item_type === itemType && f.item_id === itemId
      );

      try {
        if (existing) {
          // Remove favorite
          const { error } = await supabase
            .from("wiki_favorites")
            .delete()
            .eq("id", existing.id);

          if (error) throw error;
          setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
          toast.success("Removed from favorites");
        } else {
          // Add favorite
          const { data, error } = await supabase
            .from("wiki_favorites")
            .insert({
              user_id: user.id,
              organization_id: currentOrg.id,
              item_type: itemType,
              item_id: itemId,
            })
            .select("id, item_type, item_id")
            .single();

          if (error) throw error;
          setFavorites((prev) => [
            ...prev,
            { ...data, item_type: data.item_type as "folder" | "page" },
          ]);
          toast.success("Added to favorites");
        }
      } catch (error) {
        console.error("Error toggling favorite:", error);
        toast.error("Failed to update favorite");
      }
    },
    [user, currentOrg, favorites]
  );

  return {
    favorites,
    loading,
    isFavorite,
    toggleFavorite,
  };
};
