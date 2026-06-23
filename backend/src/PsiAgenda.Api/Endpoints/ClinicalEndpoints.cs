using PsiAgenda.Application.Clinical;
using PsiAgenda.Application.Common;

namespace PsiAgenda.Api.Endpoints;

public static class ClinicalEndpoints
{
    public static IEndpointRouteBuilder MapClinicalEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/clinical")
            .WithTags("Clinical")
            .RequireAuthorization();

        group.MapGet("/appointments/{appointmentId:guid}/workspace", GetAppointmentWorkspaceAsync);
        group.MapPost("/appointments/{appointmentId:guid}/session/start", StartAppointmentSessionAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/appointments/{appointmentId:guid}/session/complete", CompleteAppointmentSessionAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/appointments/{appointmentId:guid}/drafts", CreateAppointmentDraftAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/appointments/{appointmentId:guid}/tags", ApplyAppointmentTagsAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/appointments/{appointmentId:guid}/consents/{consentType}", UpdateAppointmentConsentAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/appointments/{appointmentId:guid}/treatment-plan", UpdateAppointmentTreatmentPlanAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/drafts/{draftId:guid}/approve", ApproveDraftAsync)
            .RequireRateLimiting("Sensitive");
        group.MapPost("/records/{recordId:guid}/rectifications", CreateRecordRectificationDraftAsync)
            .RequireRateLimiting("Sensitive");

        return app;
    }

    private static async Task<IResult> GetAppointmentWorkspaceAsync(
        Guid appointmentId,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.GetAppointmentWorkspaceAsync(currentUser.UserIdOrThrow(), appointmentId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> CreateAppointmentDraftAsync(
        Guid appointmentId,
        CreateClinicalDraftRequest request,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.CreateAppointmentDraftAsync(currentUser.UserIdOrThrow(), appointmentId, request, cancellationToken),
            draft => Results.Created($"/api/clinical/appointments/{appointmentId}/drafts/{draft.Id}", draft));
    }

    private static async Task<IResult> StartAppointmentSessionAsync(
        Guid appointmentId,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.StartAppointmentSessionAsync(currentUser.UserIdOrThrow(), appointmentId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> CompleteAppointmentSessionAsync(
        Guid appointmentId,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.CompleteAppointmentSessionAsync(currentUser.UserIdOrThrow(), appointmentId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> ApplyAppointmentTagsAsync(
        Guid appointmentId,
        ApplyClinicalTagsRequest request,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.ApplyAppointmentTagsAsync(currentUser.UserIdOrThrow(), appointmentId, request, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> ApproveDraftAsync(
        Guid draftId,
        ApproveClinicalDraftRequest request,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.ApproveDraftAsync(currentUser.UserIdOrThrow(), draftId, request, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> CreateRecordRectificationDraftAsync(
        Guid recordId,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.CreateRecordRectificationDraftAsync(currentUser.UserIdOrThrow(), recordId, cancellationToken),
            draft => Results.Created($"/api/clinical/records/{recordId}/rectifications/{draft.Id}", draft));
    }

    private static async Task<IResult> UpdateAppointmentConsentAsync(
        Guid appointmentId,
        string consentType,
        UpdatePatientConsentRequest request,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.UpdateAppointmentConsentAsync(
                currentUser.UserIdOrThrow(),
                appointmentId,
                consentType,
                request,
                cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> UpdateAppointmentTreatmentPlanAsync(
        Guid appointmentId,
        UpdateTreatmentPlanRequest request,
        ICurrentUserService currentUser,
        IClinicalService clinicalService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => clinicalService.UpdateAppointmentTreatmentPlanAsync(
                currentUser.UserIdOrThrow(),
                appointmentId,
                request,
                cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> ExecuteAsync<T>(
        Func<Task<T>> action,
        Func<T, IResult> success)
    {
        try
        {
            return success(await action());
        }
        catch (InvalidOperationException exception)
        {
            return Results.BadRequest(new { message = exception.Message });
        }
        catch (KeyNotFoundException exception)
        {
            return Results.NotFound(new { message = exception.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (FormatException)
        {
            return Results.BadRequest(new { message = "Parâmetros inválidos." });
        }
    }
}
