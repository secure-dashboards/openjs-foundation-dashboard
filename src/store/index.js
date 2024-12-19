const debug = require('debug')('store')

const getAllFn = knex => async (table) => {
  debug(`Fetching all records from ${table}...`)
  return knex(table).select('*')
}

const addFn = knex => async (table, record) => {
  debug(`Inserting ${record} in ${table}`)
  return knex(table).insert(record).returning('*')
}

const upsertRecord = async (knex, table, uniqueCriteria, data) => {
  const existingRecord = await knex(table).where(uniqueCriteria).first()
  if (existingRecord) {
    return knex(table).where(uniqueCriteria).update(data).returning('*')
  } else {
    return knex(table)
      .insert({ ...uniqueCriteria, ...data })
      .returning('*')
  }
}

const updateGithubOrganization = knex => async (organization) => {
  const { login } = organization
  debug(`Updating organization (${login})...`)
  return knex('github_organizations').where({ login }).update(organization).returning('*')
}

const addGithubOrganization = knex => async (organization) => {
  const organizationExists = await knex('github_organizations').where({ html_url: organization.html_url }).first()
  debug(`Checking if organization (${organization.login}) exists...`)
  if (organizationExists) {
    throw new Error(`Organization with login (${organization.login}) already exists`)
  }
  debug(`Inserting organization (${organization.login})...`)
  return knex('github_organizations').insert(organization).returning('*')
}

const addProject = knex => async (project) => {
  const { name, category } = project
  const projectExists = await knex('projects').where({ name }).first()
  debug(`Checking if project (${name}) exists...`)
  if (projectExists) {
    throw new Error(`Project with name (${name}) already exists`)
  }
  debug(`Inserting project (${name})...`)
  return knex('projects').insert({
    name,
    category
  }).returning('*')
}

const getCheckByCodeName = knex => async (codeName) => {
  debug(`Getting check by code name (${codeName})...`)
  return knex('compliance_checks').where({ code_name: codeName }).first()
}

const deleteAlertsByComplianceCheckId = knex => async (complianceCheckId) => {
  debug(`Deleting alerts by compliance_check_id (${complianceCheckId})...`)
  return knex('compliance_checks_alerts').where({ compliance_check_id: complianceCheckId }).delete()
}

const deleteTasksByComplianceCheckId = knex => async (complianceCheckId) => {
  debug(`Deleting tasks by compliance_check_id (${complianceCheckId})...`)
  return knex('compliance_checks_tasks').where({ compliance_check_id: complianceCheckId }).delete()
}

const upsertComplianceCheckResult = (knex) => async (result) =>
  upsertRecord(knex, 'compliance_checks_results', { compliance_check_id: result.compliance_check_id }, result)

const upsertOSSFScorecard = (knex) => async (scorecard) => {
  const uniqueCriteria = {
    github_repository_id: scorecard.github_repository_id,
    scorecard_commit: scorecard.scorecard_commit
  }
  return upsertRecord(knex, 'ossf_scorecard_results', uniqueCriteria, scorecard)
}

const upsertGithubRepository = (knex) => async (repository, orgId) => {
  const uniqueCriteria = {
    full_name: repository.full_name,
    github_organization_id: orgId
  }
  const data = { ...repository, github_organization_id: orgId }
  return upsertRecord(knex, 'github_repositories', uniqueCriteria, data)
}

const initializeStore = (knex) => {
  debug('Initializing store...')
  const getAll = getAllFn(knex)
  const addTo = addFn(knex)
  return {
    addProject: addProject(knex),
    addGithubOrganization: addGithubOrganization(knex),
    getAllGithubOrganizations: async () => getAll('github_organizations'),
    updateGithubOrganization: updateGithubOrganization(knex),
    upsertGithubRepository: upsertGithubRepository(knex),
    getAllComplianceChecks: async () => getAll('compliance_checks'),
    getCheckByCodeName: getCheckByCodeName(knex),
    getAllProjects: async () => getAll('projects'),
    deleteTasksByComplianceCheckId: deleteTasksByComplianceCheckId(knex),
    deleteAlertsByComplianceCheckId: deleteAlertsByComplianceCheckId(knex),
    addAlert: async (alert) => addTo('compliance_checks_alerts', alert),
    addTask: async (task) => addTo('compliance_checks_tasks', task),
    upsertComplianceCheckResult: upsertComplianceCheckResult(knex),
    getAllSSoftwareDesignTrainings: async () => getAll('software_design_training'),
    getAllGithubRepositories: async () => getAll('github_repositories'),
    upsertOSSFScorecard: upsertOSSFScorecard(knex)
  }
}

module.exports = {
  initializeStore
}
