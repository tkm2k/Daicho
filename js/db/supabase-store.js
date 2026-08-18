export function createSupabaseStore(sb) {
  return {
    async createEvent(name, memberNames) {
      const { data, error } = await sb.rpc("create_event", {
        p_name: name,
        p_members: memberNames,
      });
      if (error) throw error;
      return data;
    },

    async getEvent(id) {
      try {
        const { data, error } = await sb.rpc("get_event", { p_event_id: id });
        if (error) return null;
        return data;
      } catch (e) {
        return null;
      }
    },

    async listMembers(eid) {
      const { data, error } = await sb.rpc("list_members", { p_event_id: eid });
      if (error) throw error;
      return data || [];
    },

    async addMember(eid, name) {
      const { data, error } = await sb.rpc("add_member", {
        p_event_id: eid,
        p_name: name,
      });
      if (error) throw error;
      return data;
    },

    async renameMember(eid, mid, name) {
      const { error } = await sb.rpc("rename_member", {
        p_event_id: eid,
        p_member_id: mid,
        p_name: name,
      });
      if (error) throw error;
    },

    async listTransactions(eid) {
      const { data, error } = await sb.rpc("list_transactions", { p_event_id: eid });
      if (error) throw error;
      return data || [];
    },

    async addTransaction(eid, tx) {
      const { data, error } = await sb.rpc("add_transaction", {
        p_event_id: eid,
        p_category: tx.category,
        p_title: tx.title,
        p_payer_id: tx.payer_id,
        p_amount: tx.amount,
        p_lines: tx.lines,
      });
      if (error) throw error;
      return data;
    },

    async updateTransaction(eid, txId, tx) {
      const { error } = await sb.rpc("update_transaction", {
        p_event_id: eid,
        p_tx_id: txId,
        p_category: tx.category,
        p_title: tx.title,
        p_payer_id: tx.payer_id,
        p_amount: tx.amount,
        p_lines: tx.lines,
      });
      if (error) throw error;
    },

    async deleteTransaction(eid, txId) {
      const { error } = await sb.rpc("delete_transaction", {
        p_event_id: eid,
        p_tx_id: txId,
      });
      if (error) throw error;
    },
  };
}
