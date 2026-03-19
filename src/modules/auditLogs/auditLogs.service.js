const { supabaseAdmin } = require('../../config/supabaseClient');

const logAction = async ({
  userId = null,
  user_id = null,
  action,
  entityType,
  entity_type,
  entityId = null,
  entity_id = null,
  description = null
}) => {
  const { error } = await supabaseAdmin.from('audit_logs').insert({
    user_id: user_id ?? userId,
    action,
    entity_type: entity_type ?? entityType,
    entity_id: entity_id ?? entityId,
    description
  });

  if (error) {
    console.error('Failed to write audit log:', error.message);
  }
};

module.exports = {
  logAction
};
