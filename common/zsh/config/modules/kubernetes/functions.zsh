function kres(){
  kubectl set env $@ REFRESHED_AT=$(date +%Y%m%d%H%M%S)
}

kxl () {
    if [[ -z "$KUBECONFIG_LOCAL" ]]; then
        export KUBECONFIG_LOCAL=$(mktemp /tmp/kubeconfig-local-XXXXXX)
        kubectl config view --flatten --minify --raw > "$KUBECONFIG_LOCAL"
        export KUBECONFIG="$KUBECONFIG_LOCAL"
    fi
    kubectx "$@"
}

compdef kxl=kubectx

function _build_kubectl_out_alias {
  setopt localoptions norcexpandparam

  eval "function $1 { $2 }"

  eval "function _$1 {
    words=(kubectl \"\${words[@]:1}\")
    _kubectl
  }"

  compdef _$1 $1
}

_build_kubectl_out_alias "kj"  'kubectl "$@" -o json | jq'
_build_kubectl_out_alias "kjx" 'kubectl "$@" -o json | fx'
_build_kubectl_out_alias "ky"  'kubectl "$@" -o yaml | yh'
unfunction _build_kubectl_out_alias
