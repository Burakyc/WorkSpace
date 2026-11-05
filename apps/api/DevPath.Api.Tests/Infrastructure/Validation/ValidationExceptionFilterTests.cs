using DevPath.Api.Infrastructure.Validation;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;

namespace DevPath.Api.Tests.Infrastructure.Validation;

public class ValidationExceptionFilterTests
{
    [Fact]
    public void Validation_exception_becomes_a_400_problem()
    {
        var context = ContextFor(new ValidationException(new Dictionary<string, string[]>
        {
            ["title"] = ["Başlık gerekli."],
        }));

        new ValidationExceptionFilter().OnException(context);

        var result = Assert.IsType<ObjectResult>(context.Result);
        Assert.Equal(400, result.StatusCode);
        Assert.Contains("application/problem+json", result.ContentTypes);
        var problem = Assert.IsType<ValidationProblemDetails>(result.Value);
        Assert.Equal(["Başlık gerekli."], problem.Errors["title"]);
        Assert.True(context.ExceptionHandled);
    }

    [Fact]
    public void Other_exceptions_are_left_alone()
    {
        var context = ContextFor(new InvalidOperationException());

        new ValidationExceptionFilter().OnException(context);

        Assert.Null(context.Result);
        Assert.False(context.ExceptionHandled);
    }

    private static ExceptionContext ContextFor(Exception exception) =>
        new(new ActionContext(new DefaultHttpContext(), new RouteData(), new ActionDescriptor()), [])
        {
            Exception = exception,
        };
}
