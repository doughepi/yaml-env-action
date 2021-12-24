<p align="center"><strong>yaml-env-action</strong> <em>- A custom action for setting GitHub Workflow environment variables with YAML configuration files.</em></p>

# Introduction

`yaml-env-action` is a custom JavaScript action that allows for the setting of GitHub Workflow environment variables with YAML configuration files. The action can
take multiple YAML files input that override eachother, allowing for multi-environment configuration.

---

## Features

* Set GitHub Workflow environment variables using a list of YAML configuration files.
* Pass multiple files to get environment overrides.
* Complex YAML structures are supported.

## Usage

With configuration file in the root directory of your project
```yaml
# env.yaml
name: Example Config
webserver:
  url: www.example.com
```

And the following added to your GitHub Workflow

```yaml
- name: Load environment from YAML
  uses: doughepi/yaml-env-action
  with:
    files: env1.yaml # Pass a space-separated list of configuration files. Rightmost files take precedence.
```

Access the newly exported environment variable in the following steps of your GitHub Workflow.

```yaml
...
    steps:
    - uses: actions/checkout@v2
    - name: Load environment from YAML
      uses: doughepi/yaml-env-action
      with:
        files: env1.yaml # Pass a space-separated list of configuration files. Rightmost files take precedence.
    - run: echo "${{ env.WEBSERVER_URL }}"
...
```

## Another Example

A simple example...

With the following YAML configuration file.

```yaml
projectId: xxx
tfBucket: xxx
deployBucket: xxx
dnsName: xxx
```

Using the `yaml-env-action` allows you to reference the configured values as environment variables.

```yaml
on:
  push:
    branches:
      - main
jobs:
  infrastructure:
    name: "Infrastructure"
    runs-on: ubuntu-latest
    steps:
      - name: Install Terraform
        run: |
          curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
          sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
          sudo apt-get update
          sudo apt-get install terraform -y
      - name: Checkout
        uses: actions/checkout@v2

        # Use the yaml-env-action action.
      - name: Load environment from YAML
        uses: doughepi/yaml-env-action
        with:
            files: env.yaml # Pass a space-separated list of configuration files. Rightmost files take precedence.

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@master
        with:
          project_id: ${{ env.PROJECT_ID }}
          service_account_key: ${{ secrets.BUILD_KEY_PROD }}
          export_default_credentials: true
      - name: Terraform Init
        working-directory: ./infrastructure
        run: terraform init -backend-config="bucket=${{ env.TF_BUCKET }}"
      - name: Terraform Apply
        working-directory: ./infrastructure
        run: |
          terraform apply -auto-approve -no-color -var "project_id=${{ env.PROJECT_ID }}" -var "dns_name=${{ env.DNS_NAME }}" \
          -var "deploy_bucket=${{ env.DEPLOY_BUCKET }}"
    outputs:
      deploy_bucket: ${{ env.DEPLOY_BUCKET }}
  deploy:
    name: "Deploy"
    runs-on: ubuntu-latest
    needs:
      - infrastructure
    steps:
      - name: Checkout
        uses: actions/checkout@v2

        # Use the yaml-env-action action.
      - name: Load environment from YAML
        uses: doughepi/yaml-env-action
        with:
            files: env.yaml

      - name: Build website
        run: |
          yarn
          yarn build
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@master
        with:
          project_id: ${{ env.PROJECT_ID }}
          service_account_key: ${{ secrets.BUILD_KEY_PROD }}
          export_default_credentials: true
      - name: Deploy to bucket
        run: |
          gsutil rsync -r build/ gs://${{ needs.infrastructure.outputs.deploy_bucket }}
```

## Environment Variable Names

Environment variables will be available in their flattened, capital-case form. For example, a YAML file like the following:

```yaml
app:
  projectId: project-34n28c
  name: my-app
  dns: my-app.com
  database:
    hostname: localhost
```

The following environment variables will be exported:

* `APP_PROJECT_ID`
* `APP_NAME`
* `APP_DNS`
* `APP_DATABASE_HOSTNAME`

## Multiple Files

Multiple files can be passed to the `files` parameter of the action. This allows for various interesting use cases.

Note that the rightmost files override values in the leftmost files if their keys intersect.

```yaml
...
- name: Load environment from YAML
  uses: doughepi/yaml-env-action
  with:
    files: env1.yaml env2.yaml # Pass a space-separated list of configuration files. Rightmost files take precedence.
...
```

### Simple Composition

Multiple files can be passed to the `files` parameter to allow for multiple composed environment files to be available to the workflow.

```yaml
...
- name: Load environment from YAML
  uses: doughepi/yaml-env-action
  with:
    files: env1.yaml env2.yaml # Pass a space-separated list of configuration files. Rightmost files take precedence.
...
```

### Environment Overrides

Multiple files can be passed in a way that takes advantage of the rightmost-precedence to supply a set of base values and overriding environment values.

Given the following two configuration files.

```yaml
# env.base.yaml
name: application
terraform:
  bucket: f46cc6e2-86e3-428d-b266-612d7913ef2d
```

```yaml
# env.dev.yaml
webService:
  dns: my-d.webservice.com
apiService:
  dns: api-d.webservice.com
name: application-dev
```
Both can be refered to in the action.

```yaml
...
- name: Load environment from YAML
  uses: doughepi/yaml-env-action
  with:
    files: env.base.yaml env.dev.yaml 
...
```
You end up with the following environment variables.

* `NAME=application-dev`
* `TERRAFORM_BUCKET=f46cc6e2-86e3-428d-b266-612d7913ef2d`
* `WEB_SERVICE_DNS=my-d.webservice.com`
* `API_SERVICE_DNS=my-d.apiservice.com`


### Contributing

All contributions are welcome. Create an issue for questions, bugs, and features. Feel free to submit pull requests, as well. The overall development process is detailed below.

#### Development Process

Create a development branch to make your changes within.

Get the `node_modules/`

```bash
npm install
```

On your branch, you can make changes and push. The `test.yml` GitHub Workflow on this repository will kick off on each push, running simple unit and integration tests. Take a look at `test.yml` for more info on how this works. Feel free to add additional integration tests to verify your changes result in correct operation of the `yaml-env-action`.

You can also run the unit tests locally.

```bash
npm test
```

Before you create a pull request, you'll need to make sure the `dist/` folder is fully up to date with your changes.

```bash
npm run prepare
```

Releases will be handled by @doughepi using tags and releases on the `main` branch.

<p align="center">&mdash; ⭐️ &mdash;</p>
<p align="center"><i>yaml-env-action is <a href="https://github.com/doughepi/yaml-env-action/blob/main/LICENSE">MIT licensed</a> code. Designed & built in Minneapolis, MN. Used at General Mills.</i></p>