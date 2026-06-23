/*
  Service du tableau de bord.

  GET /api/users/me/dashboard renvoie en un seul appel :
  - overview : UserProgressOverviewResponse (KPIs + activité récente)
  - streak : StreakResponse (série en cours / record)
  - latestBadges : List<UserBadgeResponse>
  - assignedBlocks : List<BlockProgressSummaryResponse>
*/

import http from './http'

export const dashboardService = {
    async getDashboard() {
        const envelope = await http.get('/users/me/dashboard')
        return envelope.data
    }
}
