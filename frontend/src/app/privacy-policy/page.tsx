import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Permission Manager',
  description: 'Politique de confidentialité et gestion des données personnelles'
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 p-8 md:p-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Politique de confidentialité</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-8">
          Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">1. Responsable du traitement</h2>
          <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
            Permission Manager est un outil de gestion des permissions et droits d'accès pour entreprises.
            Le responsable du traitement des données est l'organisation qui déploie cette application.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">2. Données collectées</h2>
          <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-3">
            Nous collectons et traitons les catégories de données suivantes :
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-slate-300">
            <li>Identité : nom, prénom, adresse email</li>
            <li>Informations professionnelles : département, rôles, permissions</li>
            <li>Données de connexion : identifiant Firebase, logs de connexion</li>
            <li>Données de congés : dates, types, motifs, pièces justificatives</li>
            <li>Préférences : thème, langue, canaux de notification</li>
            <li>Cookies et données de navigation</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">3. Finalités et bases légales</h2>
          <div className="space-y-3 text-gray-700 dark:text-slate-300">
            <p><strong>Contrat</strong> — Gestion du compte utilisateur, traitement des demandes de congés, attribution des rôles et permissions.</p>
            <p><strong>Obligation légale</strong> — Conservation des archives de paie et des audits de sécurité.</p>
            <p><strong>Intérêt légitime</strong> — Notifications liées au fonctionnement du service (alertes de sécurité, validations en attente).</p>
            <p><strong>Consentement</strong> — Cookies analytiques et améliorations du produit.</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">4. Durée de conservation</h2>
          <div className="space-y-2 text-gray-700 dark:text-slate-300">
            <p><strong>Logs d'audit</strong> : 7 ans (obligation légale)</p>
            <p><strong>Tentatives de connexion</strong> : 1 an</p>
            <p><strong>Notifications</strong> : 6 mois</p>
            <p><strong>Invitations expirées</strong> : 30 jours</p>
            <p><strong>Messages</strong> : 2 ans (anonymisés au-delà)</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">5. Vos droits (RGPD)</h2>
          <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-3">
            Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-slate-300">
            <li>Droit d'accès à vos données</li>
            <li>Droit de rectification</li>
            <li>Droit à l'effacement (« droit à l'oubli »)</li>
            <li>Droit à la limitation du traitement</li>
            <li>Droit à la portabilité</li>
            <li>Droit d'opposition</li>
            <li>Droit de retirer votre consentement à tout moment</li>
          </ul>
          <p className="text-gray-700 dark:text-slate-300 mt-3">
            Pour exercer ces droits, accédez à votre page <a href="/profile" className="text-indigo-600 dark:text-indigo-400 hover:underline">Profil</a>
            ou contactez votre administrateur.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">6. Cookies</h2>
          <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
            Cette application utilise des cookies essentiels pour l'authentification et la sécurité.
            Des cookies fonctionnels (préférences) et analytiques (statistiques) sont utilisés avec votre consentement.
            Vous pouvez gérer vos préférences à tout moment via la bannière de cookies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">7. Sécurité</h2>
          <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
            Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données :
            chiffrement, authentification Firebase, audit logs immuables, limitation des accès par rôles,
            et respect de la politique de mots de passe.
          </p>
        </section>
      </div>
    </div>
  );
}
