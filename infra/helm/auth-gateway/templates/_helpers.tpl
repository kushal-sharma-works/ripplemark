{{- define "auth-gateway.fullname" -}}
{{- printf "%s-%s" .Release.Name "auth-gateway" | trunc 63 | trimSuffix "-" -}}
{{- end -}}
