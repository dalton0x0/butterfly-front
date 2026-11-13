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
    }
}
