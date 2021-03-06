/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.apache.ambari.server.serveraction.upgrades;

import static org.easymock.EasyMock.anyObject;
import static org.easymock.EasyMock.expect;
import static org.easymock.EasyMock.replay;
import static org.easymock.EasyMock.reset;
import static org.junit.Assert.assertNotNull;

import java.util.HashMap;
import java.util.Map;

import org.apache.ambari.server.actionmanager.ExecutionCommandWrapper;
import org.apache.ambari.server.actionmanager.HostRoleCommand;
import org.apache.ambari.server.actionmanager.HostRoleStatus;
import org.apache.ambari.server.agent.CommandReport;
import org.apache.ambari.server.agent.ExecutionCommand;
import org.apache.ambari.server.audit.AuditLogger;
import org.apache.ambari.server.controller.KerberosHelper;
import org.apache.ambari.server.state.Cluster;
import org.apache.ambari.server.state.Clusters;
import org.apache.ambari.server.state.Config;
import org.apache.ambari.server.state.ConfigImpl;
import org.apache.ambari.server.state.SecurityType;
import org.apache.commons.lang.StringUtils;
import org.easymock.EasyMock;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;

import com.google.inject.AbstractModule;
import com.google.inject.Guice;
import com.google.inject.Injector;

/**
 * Tests upgrade-related server side actions
*/

public class KerberosKeytabsActionTest {

  private Injector m_injector;
  private Clusters m_clusters;
  private KerberosHelper m_kerberosHelper;
  private Config m_kerberosConfig;

  @Before
  public void setup() throws Exception {

    m_clusters = EasyMock.createMock(Clusters.class);
    m_kerberosHelper = EasyMock.createMock(KerberosHelper.class);

    m_kerberosConfig = new ConfigImpl("kerberos-env") {
      Map<String, String> mockProperties = new HashMap<String, String>() {{
        put("kerberos-env", "");
      }};

      @Override
      public Map<String, String> getProperties() {
        return mockProperties;
      }

      @Override
      public void setProperties(Map<String, String> properties) {
        mockProperties.putAll(properties);
      }

      @Override
      public void persist(boolean newConfig) {
        // no-op
      }
    };

    Cluster cluster = EasyMock.createMock(Cluster.class);

    expect(cluster.getDesiredConfigByType("kerberos-env")).andReturn(m_kerberosConfig).atLeastOnce();
    expect(cluster.getSecurityType()).andReturn(SecurityType.KERBEROS).anyTimes();
    expect(m_clusters.getCluster((String) anyObject())).andReturn(cluster).anyTimes();

    replay(m_clusters, cluster);

    m_injector = Guice.createInjector(new AbstractModule() {

      @Override
      protected void configure() {
        bind(Clusters.class).toInstance(m_clusters);
        bind(KerberosHelper.class).toInstance(m_kerberosHelper);
        bind(AuditLogger.class).toInstance(EasyMock.createNiceMock(AuditLogger.class));
      }
    });
  }

  @Test
  public void testAction_NotKerberized() throws Exception {
    reset(m_kerberosHelper);
    expect(m_kerberosHelper.isClusterKerberosEnabled(EasyMock.anyObject(Cluster.class))).andReturn(Boolean.FALSE).atLeastOnce();
    replay(m_kerberosHelper);

    Map<String, String> commandParams = new HashMap<String, String>();
    commandParams.put("clusterName", "c1");

    ExecutionCommand executionCommand = new ExecutionCommand();
    executionCommand.setCommandParams(commandParams);
    executionCommand.setClusterName("c1");

    HostRoleCommand hrc = EasyMock.createMock(HostRoleCommand.class);
    expect(hrc.getRequestId()).andReturn(1L).anyTimes();
    expect(hrc.getStageId()).andReturn(2L).anyTimes();
    expect(hrc.getExecutionCommandWrapper()).andReturn(new ExecutionCommandWrapper(executionCommand)).anyTimes();
    replay(hrc);

    KerberosKeytabsAction action = m_injector.getInstance(KerberosKeytabsAction.class);

    action.setExecutionCommand(executionCommand);
    action.setHostRoleCommand(hrc);

    CommandReport report = action.execute(null);
    assertNotNull(report);

    Assert.assertEquals(HostRoleStatus.COMPLETED.name(), report.getStatus());
    Assert.assertTrue(StringUtils.contains(report.getStdOut(), "Cluster c1 is not secured by Kerberos"));
    Assert.assertTrue(StringUtils.contains(report.getStdOut(), "No action required."));
  }

  @Test
  public void testAction_NoKdcType() throws Exception {
    reset(m_kerberosHelper);
    expect(m_kerberosHelper.isClusterKerberosEnabled(EasyMock.anyObject(Cluster.class))).andReturn(Boolean.TRUE).atLeastOnce();
    replay(m_kerberosHelper);

    Map<String, String> commandParams = new HashMap<String, String>();
    commandParams.put("clusterName", "c1");

    ExecutionCommand executionCommand = new ExecutionCommand();
    executionCommand.setCommandParams(commandParams);
    executionCommand.setClusterName("c1");

    HostRoleCommand hrc = EasyMock.createMock(HostRoleCommand.class);
    expect(hrc.getRequestId()).andReturn(1L).anyTimes();
    expect(hrc.getStageId()).andReturn(2L).anyTimes();
    expect(hrc.getExecutionCommandWrapper()).andReturn(new ExecutionCommandWrapper(executionCommand)).anyTimes();
    replay(hrc);

    KerberosKeytabsAction action = m_injector.getInstance(KerberosKeytabsAction.class);

    action.setExecutionCommand(executionCommand);
    action.setHostRoleCommand(hrc);

    CommandReport report = action.execute(null);
    assertNotNull(report);

    Assert.assertEquals(HostRoleStatus.COMPLETED.name(), report.getStatus());
    Assert.assertTrue(StringUtils.contains(report.getStdOut(), "KDC Type is NONE"));
    Assert.assertTrue(StringUtils.contains(report.getStdOut(), "No action required."));
  }

  @Test
  public void testAction_Kerberized() throws Exception {
    reset(m_kerberosHelper);
    expect(m_kerberosHelper.isClusterKerberosEnabled(EasyMock.anyObject(Cluster.class))).andReturn(Boolean.TRUE).atLeastOnce();
    replay(m_kerberosHelper);
    m_kerberosConfig.getProperties().put("kdc_type", "mit-kdc");

    Map<String, String> commandParams = new HashMap<String, String>();
    commandParams.put("clusterName", "c1");

    ExecutionCommand executionCommand = new ExecutionCommand();
    executionCommand.setCommandParams(commandParams);
    executionCommand.setClusterName("c1");

    HostRoleCommand hrc = EasyMock.createMock(HostRoleCommand.class);
    expect(hrc.getRequestId()).andReturn(1L).anyTimes();
    expect(hrc.getStageId()).andReturn(2L).anyTimes();
    expect(hrc.getExecutionCommandWrapper()).andReturn(new ExecutionCommandWrapper(executionCommand)).anyTimes();
    replay(hrc);

    KerberosKeytabsAction action = m_injector.getInstance(KerberosKeytabsAction.class);

    action.setExecutionCommand(executionCommand);
    action.setHostRoleCommand(hrc);

    CommandReport report = action.execute(null);
    assertNotNull(report);

    Assert.assertEquals(HostRoleStatus.HOLDING.name(), report.getStatus());
    Assert.assertTrue(StringUtils.contains(report.getStdOut(), "Checking KDC type... MIT_KDC"));
    Assert.assertTrue(StringUtils.contains(report.getStdOut(), "Regenerate keytabs after upgrade is complete."));
  }
}
