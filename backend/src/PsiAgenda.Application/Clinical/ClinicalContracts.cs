namespace PsiAgenda.Application.Clinical;

public sealed record ClinicalWorkspaceDto(
    Guid AppointmentId,
    Guid PatientId,
    Guid ProfessionalId,
    Guid SpaceId,
    ClinicalSessionDto Session,
    IReadOnlyList<ClinicalDraftDto> Drafts,
    IReadOnlyList<ClinicalRecordDto> Records,
    IReadOnlyList<AppliedClinicalTagDto> Tags,
    IReadOnlyList<PatientConsentDto> Consents,
    TreatmentPlanDto TreatmentPlan,
    IReadOnlyList<PatientTaskDto> Tasks,
    IReadOnlyList<SharedMaterialDto> Materials,
    IReadOnlyList<PatientCheckInDto> CheckIns,
    IReadOnlyList<PatientTimelineItemDto> Timeline);

public sealed record PatientCarePortalDto(
    Guid PatientId,
    IReadOnlyList<PatientTaskDto> Tasks,
    IReadOnlyList<SharedMaterialDto> Materials,
    IReadOnlyList<PatientCheckInDto> CheckIns,
    IReadOnlyList<PatientPortalConsentDto> Consents);

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
    DateTimeOffset CreatedAt);

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

public interface IClinicalService
{
    Task<ClinicalWorkspaceDto> GetAppointmentWorkspaceAsync(Guid professionalUserId, Guid appointmentId, CancellationToken cancellationToken);
    Task<PatientCarePortalDto> GetPatientCarePortalAsync(Guid patientUserId, CancellationToken cancellationToken);
    Task<PatientTaskDto> CompletePatientTaskAsync(Guid patientUserId, Guid taskId, CompletePatientTaskRequest request, CancellationToken cancellationToken);
    Task<PatientCheckInDto> RespondPatientCheckInAsync(Guid patientUserId, Guid checkInId, RespondPatientCheckInRequest request, CancellationToken cancellationToken);
    Task<PatientPortalConsentDto> UpdatePatientPortalConsentAsync(Guid patientUserId, Guid professionalId, string consentType, UpdatePatientConsentRequest request, CancellationToken cancellationToken);
    Task<ClinicalDraftDto> CreateAppointmentDraftAsync(Guid professionalUserId, Guid appointmentId, CreateClinicalDraftRequest request, CancellationToken cancellationToken);
    Task<ClinicalDraftDto> CreateRecordRectificationDraftAsync(Guid professionalUserId, Guid recordId, CancellationToken cancellationToken);
    Task<IReadOnlyList<AppliedClinicalTagDto>> ApplyAppointmentTagsAsync(Guid professionalUserId, Guid appointmentId, ApplyClinicalTagsRequest request, CancellationToken cancellationToken);
    Task<ClinicalRecordDto> ApproveDraftAsync(Guid professionalUserId, Guid draftId, ApproveClinicalDraftRequest request, CancellationToken cancellationToken);
    Task<PatientConsentDto> UpdateAppointmentConsentAsync(Guid professionalUserId, Guid appointmentId, string consentType, UpdatePatientConsentRequest request, CancellationToken cancellationToken);
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
    Task<ClinicalSessionDto> StartAppointmentSessionAsync(Guid professionalUserId, Guid appointmentId, CancellationToken cancellationToken);
    Task<ClinicalSessionDto> CompleteAppointmentSessionAsync(Guid professionalUserId, Guid appointmentId, CancellationToken cancellationToken);
}
