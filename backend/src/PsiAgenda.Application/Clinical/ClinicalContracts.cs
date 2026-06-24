namespace PsiAgenda.Application.Clinical;

public sealed record ClinicalWorkspaceDto(
    Guid AppointmentId,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    ClinicalAccessPolicyDto AccessPolicy,
    ClinicalDataProtectionPolicyDto DataProtection,
    ClinicalSessionDto Session,
    IReadOnlyList<ClinicalDraftDto> Drafts,
    IReadOnlyList<ClinicalRecordDto> Records,
    IReadOnlyList<AppliedClinicalTagDto> Tags,
    IReadOnlyList<PatientConsentDto> Consents,
    IReadOnlyList<PatientConsentEventDto> ConsentHistory,
    IReadOnlyList<PatientConsentTermDto> ConsentTerms,
    IReadOnlyList<ClinicalRetentionPolicyDto> RetentionPolicies,
    TreatmentPlanDto TreatmentPlan,
    IReadOnlyList<PatientTaskDto> Tasks,
    IReadOnlyList<SharedMaterialDto> Materials,
    IReadOnlyList<PatientCheckInDto> CheckIns,
    IReadOnlyList<ClinicalAlertDto> Alerts,
    IReadOnlyList<PatientTimelineItemDto> Timeline);

public sealed record ClinicalAccessPolicyDto(
    string ActorRole,
    bool HasProfessionalPatientRelationship,
    IReadOnlyList<ClinicalPermissionDto> Permissions,
    IReadOnlyList<ClinicalRoleBoundaryDto> RoleBoundaries,
    IReadOnlyList<ClinicalPolicyGuardrailDto> Guardrails);

public sealed record ClinicalPermissionDto(
    string Key,
    string Label,
    bool Granted,
    string Reason,
    bool RequiresConsent,
    string? ConsentType);

public sealed record ClinicalRoleBoundaryDto(
    string RoleKey,
    string Label,
    string AccessLevel,
    bool ClinicalContentAllowed,
    bool RequiresFormalAssignment,
    string Scope,
    string Reason);

public sealed record ClinicalPolicyGuardrailDto(
    string Key,
    string Label,
    string Status,
    string Detail,
    string? RelatedConsentType);

public sealed record ClinicalDataProtectionPolicyDto(
    bool Enabled,
    string Algorithm,
    string KeySource,
    bool LegacyPlainTextReadable,
    IReadOnlyList<string> ProtectedFields,
    string Status,
    string RotationNotice);

public sealed record PatientCarePortalDto(
    Guid PatientId,
    IReadOnlyList<PatientTaskDto> Tasks,
    IReadOnlyList<SharedMaterialDto> Materials,
    IReadOnlyList<PatientCheckInDto> CheckIns,
    IReadOnlyList<PatientPortalConsentDto> Consents,
    IReadOnlyList<PatientPortalConsentDto> SensitiveConsents,
    IReadOnlyList<PatientConsentEventDto> ConsentHistory,
    IReadOnlyList<PatientConsentTermDto> ConsentTerms,
    IReadOnlyList<ClinicalRetentionPolicyDto> RetentionPolicies,
    ClinicalDataProtectionPolicyDto DataProtection);

public sealed record ClinicalSessionDto(
    Guid Id,
    Guid? AppointmentId,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    string SessionType,
    string Status,
    DateTimeOffset? StartedAt,
    DateTimeOffset? EndedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record ClinicalDraftDto(
    Guid Id,
    Guid? AppointmentId,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    string Status,
    string Source,
    string RecordType,
    Guid? PreviousRecordId,
    string? SessionNote,
    string ContentText,
    IReadOnlyList<ClinicalTagInput> Tags,
    bool AiGenerated,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public sealed record AppliedClinicalTagDto(
    Guid Id,
    Guid? AppointmentId,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    string Label,
    string Tone,
    string? Note,
    DateTimeOffset AppliedAt);

public sealed record ClinicalRecordDto(
    Guid Id,
    Guid? AppointmentId,
    Guid? DraftId,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    string RecordType,
    string Status,
    string ContentText,
    IReadOnlyList<ClinicalTagInput> Tags,
    int Version,
    Guid? PreviousRecordId,
    DateTimeOffset ApprovedAt,
    DateTimeOffset CreatedAt);

public sealed record ClinicalRecordExportDto(
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    DateTimeOffset ExportedAt,
    int RecordsCount,
    string Scope,
    string Notice,
    IReadOnlyList<ClinicalRecordExportItemDto> Records,
    string ContentText);

public sealed record ClinicalRecordExportItemDto(
    Guid Id,
    Guid? AppointmentId,
    string RecordType,
    int Version,
    Guid? PreviousRecordId,
    DateTimeOffset ApprovedAt,
    IReadOnlyList<ClinicalTagInput> Tags);

public sealed record ClinicalAlertDto(
    Guid Id,
    Guid? AppointmentId,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    string SourceType,
    Guid? SourceId,
    string Title,
    string Description,
    string Severity,
    string Status,
    string? ReviewNote,
    DateTimeOffset? ReviewedAt,
    DateTimeOffset? ResolvedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record PatientTimelineItemDto(
    Guid Id,
    Guid? AppointmentId,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    string SourceType,
    Guid? SourceId,
    string Title,
    string Summary,
    string Layer,
    DateTimeOffset OccurredAt,
    bool Archived,
    DateTimeOffset? ArchivedAt,
    string? ArchiveReason,
    DateTimeOffset CreatedAt);

public sealed record PatientTimelineItemDetailDto(
    PatientTimelineItemDto Item,
    string? AppointmentCode,
    DateTimeOffset? AppointmentStartDateTime,
    string SourceLabel,
    string? SourceStatus,
    string? SourceTypeDetail,
    int? SourceVersion,
    bool CanOpenSource,
    bool CanArchive,
    string AccessNote);

public sealed record PatientConsentDto(
    Guid? Id,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    string ConsentType,
    string Status,
    string TermsVersion,
    DateTimeOffset? GrantedAt,
    DateTimeOffset? RevokedAt,
    DateTimeOffset? ExpiresAt,
    DateTimeOffset? UpdatedAt);

public sealed record PatientPortalConsentDto(
    Guid? Id,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    string ProfessionalName,
    string SpaceName,
    string ConsentType,
    string Status,
    string TermsVersion,
    DateTimeOffset? GrantedAt,
    DateTimeOffset? RevokedAt,
    DateTimeOffset? ExpiresAt,
    DateTimeOffset? UpdatedAt);

public sealed record PatientConsentEventDto(
    Guid Id,
    Guid PatientConsentId,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    Guid? AppointmentId,
    Guid ActorUserId,
    string ConsentType,
    string Status,
    string Action,
    string TermsVersion,
    DateTimeOffset? GrantedAt,
    DateTimeOffset? RevokedAt,
    DateTimeOffset? ExpiresAt,
    DateTimeOffset CreatedAt);

public sealed record PatientConsentTermDto(
    Guid Id,
    string ConsentType,
    string Version,
    string Title,
    string Summary,
    string LegalBasis,
    string RetentionPolicy,
    string ReviewNotice,
    bool Sensitive,
    bool RequiresExplicitPatientDecision,
    bool IsActive,
    DateTimeOffset EffectiveAt,
    DateTimeOffset? RetiredAt);

public sealed record ClinicalRetentionPolicyDto(
    Guid ProfessionalId,
    Guid SpaceId,
    string ConsentType,
    string TermsVersion,
    string Status,
    bool Sensitive,
    bool DataUseAllowed,
    bool PatientCanRevoke,
    DateTimeOffset? ActiveUntil,
    string RetentionPolicy,
    string RevocationEffect,
    string ExpirationEffect,
    string ReviewNotice);

public sealed record TreatmentPlanDto(
    Guid? Id,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    string Status,
    string? CaseFormulation,
    IReadOnlyList<string> Goals,
    IReadOnlyList<string> Strategies,
    IReadOnlyList<string> Obstacles,
    string? ReviewCadence,
    DateTimeOffset? CreatedAt,
    DateTimeOffset? UpdatedAt);

public sealed record PatientTaskDto(
    Guid Id,
    Guid? AppointmentId,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    string Title,
    string? Description,
    DateTimeOffset? DueAt,
    string Status,
    bool AcceptsResponse,
    string? ResponseText,
    DateTimeOffset? ResponseSubmittedAt,
    DateTimeOffset? SharedAt,
    DateTimeOffset? CompletedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record SharedMaterialDto(
    Guid Id,
    Guid? AppointmentId,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    string MaterialType,
    string Title,
    string? Description,
    string? Url,
    string Status,
    DateTimeOffset? SharedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record PatientCheckInDto(
    Guid Id,
    Guid? AppointmentId,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    string Prompt,
    string? ContextNote,
    DateTimeOffset? DueAt,
    string Status,
    int? MoodScore,
    string? ResponseText,
    DateTimeOffset? RespondedAt,
    DateTimeOffset? SharedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record ClinicalTagInput(
    string Label,
    string Tone);

public sealed record CreateClinicalDraftRequest(
    string? SessionNote,
    string ContentText,
    IReadOnlyList<ClinicalTagInput> Tags);

public sealed record ApplyClinicalTagsRequest(
    IReadOnlyList<ClinicalTagInput> Tags,
    string? Note);

public sealed record ApproveClinicalDraftRequest(
    string? ContentText);

public sealed record UpdatePatientConsentRequest(
    string Status,
    string? TermsVersion,
    DateTimeOffset? ExpiresAt);

public sealed record RequestSensitiveConsentRequest(
    IReadOnlyList<string> ConsentTypes,
    string? TermsVersion);

public sealed record UpdateTreatmentPlanRequest(
    string Status,
    string? CaseFormulation,
    IReadOnlyList<string> Goals,
    IReadOnlyList<string> Strategies,
    IReadOnlyList<string> Obstacles,
    string? ReviewCadence);

public sealed record CreatePatientTaskRequest(
    string Title,
    string? Description,
    DateTimeOffset? DueAt,
    bool AcceptsResponse);

public sealed record CompletePatientTaskRequest(
    string? ResponseText);

public sealed record CreateSharedMaterialRequest(
    string MaterialType,
    string Title,
    string? Description,
    string? Url);

public sealed record CreatePatientCheckInRequest(
    string Prompt,
    string? ContextNote,
    DateTimeOffset? DueAt);

public sealed record RespondPatientCheckInRequest(
    int MoodScore,
    string? ResponseText);

public sealed record CreateClinicalAlertRequest(
    string Title,
    string Description,
    string Severity);

public sealed record ReviewClinicalAlertRequest(
    string? ReviewNote);

public sealed record ClinicalAlertQuery(
    string? Severity,
    string? Status,
    string? SourceType,
    bool? OnlyActive,
    int? Limit);

public sealed record PatientTimelineQuery(
    string? SourceType,
    string? Layer,
    string? Tag,
    string? Severity,
    DateTimeOffset? From,
    DateTimeOffset? To,
    string? Search,
    int? Limit);

public sealed record ArchiveTimelineItemRequest(
    string? Reason);

public interface IClinicalService
{
    Task<int> ExpireDuePatientConsentsAsync(CancellationToken cancellationToken);
    Task<ClinicalWorkspaceDto> GetAppointmentWorkspaceAsync(Guid professionalUserId, Guid appointmentId, CancellationToken cancellationToken);
    Task<IReadOnlyList<ClinicalAlertDto>> GetPatientAlertsAsync(Guid professionalUserId, Guid patientId, ClinicalAlertQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyList<PatientTimelineItemDto>> GetPatientTimelineAsync(Guid professionalUserId, Guid patientId, PatientTimelineQuery query, CancellationToken cancellationToken);
    Task<PatientTimelineItemDetailDto> GetTimelineItemDetailAsync(Guid professionalUserId, Guid itemId, CancellationToken cancellationToken);
    Task<PatientTimelineItemDetailDto> ArchiveTimelineItemAsync(Guid professionalUserId, Guid itemId, ArchiveTimelineItemRequest request, CancellationToken cancellationToken);
    Task<ClinicalRecordExportDto> ExportPatientRecordsAsync(Guid professionalUserId, Guid patientId, CancellationToken cancellationToken);
    Task<PatientCarePortalDto> GetPatientCarePortalAsync(Guid patientUserId, CancellationToken cancellationToken);
    Task<PatientTaskDto> CompletePatientTaskAsync(Guid patientUserId, Guid taskId, CompletePatientTaskRequest request, CancellationToken cancellationToken);
    Task<PatientCheckInDto> RespondPatientCheckInAsync(Guid patientUserId, Guid checkInId, RespondPatientCheckInRequest request, CancellationToken cancellationToken);
    Task<PatientPortalConsentDto> UpdatePatientPortalConsentAsync(Guid patientUserId, Guid professionalId, string consentType, UpdatePatientConsentRequest request, CancellationToken cancellationToken);
    Task<PatientPortalConsentDto> UpdatePatientSensitiveConsentAsync(Guid patientUserId, Guid professionalId, string consentType, UpdatePatientConsentRequest request, CancellationToken cancellationToken);
    Task<ClinicalDraftDto> CreateAppointmentDraftAsync(Guid professionalUserId, Guid appointmentId, CreateClinicalDraftRequest request, CancellationToken cancellationToken);
    Task<ClinicalDraftDto> CreateRecordRectificationDraftAsync(Guid professionalUserId, Guid recordId, CancellationToken cancellationToken);
    Task<IReadOnlyList<AppliedClinicalTagDto>> ApplyAppointmentTagsAsync(Guid professionalUserId, Guid appointmentId, ApplyClinicalTagsRequest request, CancellationToken cancellationToken);
    Task<ClinicalRecordDto> ApproveDraftAsync(Guid professionalUserId, Guid draftId, ApproveClinicalDraftRequest request, CancellationToken cancellationToken);
    Task<PatientConsentDto> UpdateAppointmentConsentAsync(Guid professionalUserId, Guid appointmentId, string consentType, UpdatePatientConsentRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<PatientConsentDto>> RequestAppointmentSensitiveConsentsAsync(Guid professionalUserId, Guid appointmentId, RequestSensitiveConsentRequest request, CancellationToken cancellationToken);
    Task<TreatmentPlanDto> UpdateAppointmentTreatmentPlanAsync(Guid professionalUserId, Guid appointmentId, UpdateTreatmentPlanRequest request, CancellationToken cancellationToken);
    Task<PatientTaskDto> CreateAppointmentTaskAsync(Guid professionalUserId, Guid appointmentId, CreatePatientTaskRequest request, CancellationToken cancellationToken);
    Task<PatientTaskDto> ShareTaskAsync(Guid professionalUserId, Guid taskId, CancellationToken cancellationToken);
    Task<PatientTaskDto> UnshareTaskAsync(Guid professionalUserId, Guid taskId, CancellationToken cancellationToken);
    Task<SharedMaterialDto> CreateAppointmentMaterialAsync(Guid professionalUserId, Guid appointmentId, CreateSharedMaterialRequest request, CancellationToken cancellationToken);
    Task<SharedMaterialDto> ShareMaterialAsync(Guid professionalUserId, Guid materialId, CancellationToken cancellationToken);
    Task<SharedMaterialDto> UnshareMaterialAsync(Guid professionalUserId, Guid materialId, CancellationToken cancellationToken);
    Task<PatientCheckInDto> CreateAppointmentCheckInAsync(Guid professionalUserId, Guid appointmentId, CreatePatientCheckInRequest request, CancellationToken cancellationToken);
    Task<PatientCheckInDto> ShareCheckInAsync(Guid professionalUserId, Guid checkInId, CancellationToken cancellationToken);
    Task<PatientCheckInDto> UnshareCheckInAsync(Guid professionalUserId, Guid checkInId, CancellationToken cancellationToken);
    Task<ClinicalAlertDto> CreateAppointmentAlertAsync(Guid professionalUserId, Guid appointmentId, CreateClinicalAlertRequest request, CancellationToken cancellationToken);
    Task<ClinicalAlertDto> ReviewAlertAsync(Guid professionalUserId, Guid alertId, string status, ReviewClinicalAlertRequest request, CancellationToken cancellationToken);
    Task<ClinicalSessionDto> StartAppointmentSessionAsync(Guid professionalUserId, Guid appointmentId, CancellationToken cancellationToken);
    Task<ClinicalSessionDto> CompleteAppointmentSessionAsync(Guid professionalUserId, Guid appointmentId, CancellationToken cancellationToken);
}
