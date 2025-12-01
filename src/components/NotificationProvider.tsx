import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const NotificationProvider = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Subscribe to group messages
    const messagesChannel = supabase
      .channel('group-messages-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages'
        },
        async (payload) => {
          const newMessage = payload.new as {
            id: string;
            user_id: string;
            group_id: string;
            content: string;
          };

          // Don't notify for own messages
          if (newMessage.user_id === user.id) return;

          // Check if user is member of the group
          const { data: membership } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('group_id', newMessage.group_id)
            .eq('user_id', user.id)
            .single();

          if (!membership) return;

          // Get group name and sender name
          const [groupResult, senderResult] = await Promise.all([
            supabase.from('groups').select('name').eq('id', newMessage.group_id).single(),
            supabase.from('profiles').select('full_name, username').eq('id', newMessage.user_id).single()
          ]);

          const groupName = groupResult.data?.name || '그룹';
          const senderName = senderResult.data?.full_name || senderResult.data?.username || '익명';

          toast.info(`${groupName}에 새 메시지`, {
            description: `${senderName}: ${newMessage.content.slice(0, 50)}${newMessage.content.length > 50 ? '...' : ''}`,
            duration: 5000,
          });
        }
      )
      .subscribe();

    // Subscribe to group vocabulary shares
    const vocabulariesChannel = supabase
      .channel('group-vocabularies-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_vocabularies'
        },
        async (payload) => {
          const newShare = payload.new as {
            id: string;
            shared_by: string;
            group_id: string;
            vocabulary_id: string;
          };

          // Don't notify for own shares
          if (newShare.shared_by === user.id) return;

          // Check if user is member of the group
          const { data: membership } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('group_id', newShare.group_id)
            .eq('user_id', user.id)
            .single();

          if (!membership) return;

          // Get group name, sharer name, and vocabulary name
          const [groupResult, sharerResult, vocabResult] = await Promise.all([
            supabase.from('groups').select('name').eq('id', newShare.group_id).single(),
            supabase.from('profiles').select('full_name, username').eq('id', newShare.shared_by).single(),
            supabase.from('vocabularies').select('name').eq('id', newShare.vocabulary_id).single()
          ]);

          const groupName = groupResult.data?.name || '그룹';
          const sharerName = sharerResult.data?.full_name || sharerResult.data?.username || '익명';
          const vocabName = vocabResult.data?.name || '단어장';

          toast.success(`${groupName}에 새 단어장 공유`, {
            description: `${sharerName}님이 "${vocabName}"을(를) 공유했습니다.`,
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(vocabulariesChannel);
    };
  }, [user]);

  return null;
};
