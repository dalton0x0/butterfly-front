/*
  Service du tableau de bord.

  GET /api/users/me/dashboard renvoie en un seul appel :
  - overview : UserProgressOverviewResponse (KPIs + activité récente)
  - streak : StreakResponse (série en cours / record)
  - latestBadges : List<UserBadgeResponse>
  - assignedBlocks : List<BlockProgressSummaryResponse>

  GET /api/users/me/teacher-dashboard (TEACHER) renvoie :
  - pendingCount, oldestPending : rendus à corriger, les plus anciens d'abord
  - blocks : {blockId, blockName, learnerCount, pendingCount} par bloc
  - inactiveLearnerCount, inactiveLearners, inactivityDays : apprenants sans activité récente

  GET /api/users/me/admin-dashboard (ADMIN, MANAGER) renvoie AdminDashboardResponse :
  - comptages par rôle, comptes désactivés, corbeille, blocs, promotions
    (managers, admins et deletedAccounts absents pour un gestionnaire)
  - pendingCount, oldestPending, recentLearners, inactiveLearnerCount, inactiveLearners, inactivityDays
*/

import http from './http'

export const dashboardService = {
    async getDashboard() {
        const envelope = await http.get('/users/me/dashboard')
        return envelope.data
    },

    async getTeacherDashboard() {
        const envelope = await http.get('/users/me/teacher-dashboard')
        return envelope.data
    },

    async getAdminDashboard() {
        const envelope = await http.get('/users/me/admin-dashboard')
        return envelope.data
    }
}
