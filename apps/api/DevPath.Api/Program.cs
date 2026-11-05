using System.Net;
using DevPath.Api.Infrastructure.Hosting;

var builder = WebApplication.CreateBuilder(args);

var port = ApiPort.Resolve(builder.Configuration["DEVPATH_PORT"]);
builder.WebHost.ConfigureKestrel(options => options.Listen(IPAddress.Loopback, port));

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapControllers();

app.Run();
