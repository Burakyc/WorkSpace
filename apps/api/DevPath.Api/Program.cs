using System.Net;
using DevPath.Api.Infrastructure.Hosting;

var builder = WebApplication.CreateBuilder(args);

var port = ApiPort.Resolve(builder.Configuration["DEVPATH_PORT"]);
builder.WebHost.ConfigureKestrel(options => options.Listen(IPAddress.Loopback, port));

builder.Services.AddControllers();

var app = builder.Build();

app.MapControllers();

app.Run();
