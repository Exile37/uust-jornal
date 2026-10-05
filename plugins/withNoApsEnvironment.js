// Локальные уведомления не требуют push-entitlement, а бесплатный Apple ID
// не может подписать aps-environment. Убираем его после плагина expo-notifications.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withNoApsEnvironment(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
