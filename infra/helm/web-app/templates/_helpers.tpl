{{- define "web-app.fullname" -}}
{{- printf "%s-%s" .Release.Name "web-app" | trunc 63 | trimSuffix "-" -}}
{{- end -}}
